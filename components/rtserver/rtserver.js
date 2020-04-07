/**
 * @namespace hs.rtserver
 * @memberOf hs
 */
define(['angular', 'ol', 'socketio', 'utils', 'map'], (
  angular,
  ol,
  socketio
) => {
  angular
    .module('hs.rtserver', ['hs.map', 'hs.utils'])
    .service('hs.rtserver.service', [
      'hs.utils.service',
      '$rootScope',
      'hs.map.service',
      'hs.compositions.service_parser',
      function (utils, $rootScope, hs_map, composition_parser) {
        const map = hs_map.map;

        function init() {
          me.uuid = utils.generateUuid();
          const socket = socketio('localhost:3000');
          socket.on('connect', () => {
            me.socket = socket;
          });

          socket.on('sync', (response) => {
            switch (response.event) {
              case 'feature_drawn':
                var format = new ol.format.GeoJSON();
                var features = format.readFeatures(response.data.features);
                var layer = hs_map.findLayerByTitle(response.data.layer);
                layer.getSource().addFeatures(features);
                angular.forEach(features, (feature) => {
                  feature.setId(feature.get('hs_id'));
                });
                break;
              case 'feature_deleted':
                var format = new ol.format.GeoJSON();
                var layer = hs_map.findLayerByTitle(response.data.layer);
                layer
                  .getSource()
                  .removeFeature(
                    layer.getSource().getFeatureById(response.data.feature_id)
                  );
                break;
              case 'layer_added':
                map.addLayer(
                  composition_parser.jsonToLayer(response.data.layer)
                );
                if (!$rootScope.$$phase) {
                  $rootScope.$digest();
                }
                break;
            }
          });

          socket.on('disconnect', () => {});

          $rootScope.$on('feature_drawn', forwardEventfunction);
          $rootScope.$on('feature_deleted', forwardEventfunction);
          $rootScope.$on('layer_added', forwardEventfunction);
        }

        function forwardEventfunction(event, data) {
          me.socket.emit('sync', wrapData(event.name, data));
        }

        function wrapData(event, data) {
          return {
            sender: me.uuid,
            event: event,
            data: data,
          };
        }

        this.init = init;
        var me = this;
      },
    ]);
});
