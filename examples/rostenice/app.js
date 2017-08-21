'use strict';

define(['ol', 'toolbar', 'layermanager', 'geojson', 'sidebar', 'query', 'search', 'print', 'permalink', 'measure', 'geolocation', 'api', 'cesium', 'ows', 'cesiumjs'],

    function(ol, toolbar, layermanager, geojson) {
        var module = angular.module('hs', [
            'hs.toolbar',
            'hs.layermanager',
            'hs.query',
            'hs.search', 'hs.print', 'hs.permalink',
            'hs.geolocation',
            'hs.cesium',
            'hs.sidebar',
            'hs.ows'
        ]);

        module.directive('hs', ['hs.map.service', 'Core', '$compile', '$timeout', function(OlMap, Core, $compile, $timeout) {
            return {
                templateUrl: hsl_path + 'hslayers.html',
                link: function(scope, element) {
                    angular.element('.page-content', element).append($compile('<div hs.cesium.directive ng-controller="hs.cesium.controller"></div>')(scope));
                    $timeout(function() {
                        Core.fullScreenMap(element)
                    }, 0);
                }
            };
        }]);


        module.value('config', {
            terrain_provider: 'http://gis.lesprojekt.cz/cts/tilesets/rostenice_dmp1g/',
            terrain_providers: [{
                title: 'Local terrain',
                url: 'http://gis.lesprojekt.cz/cts/tilesets/rostenice_dmp1g/',
                active: true
            }, {
                title: 'SRTM',
                url: 'https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles',
                active: false
            }],
            default_layers: [
                new ol.layer.Tile({
                    source: new ol.source.OSM(),
                    title: "OpenStreetMap",
                    base: true,
                    visible: false,
                    minimumTerrainLevel: 15
                }),
                new ol.layer.Tile({
                    title: "Open-Land-Use (WMS)",
                    source: new ol.source.TileWMS({
                        url: 'http://gis.lesprojekt.cz/cgi-bin/mapserv?map=/home/dima/maps/olu/openlandusemap.map',
                        params: {
                            LAYERS: 'olu_bbox_srid',
                            FORMAT: "image/png",
                            INFO_FORMAT: "text/html",
                            minimumTerrainLevel: 15
                        },
                        crossOrigin: null
                    }),
                    legends: ['http://gis.lesprojekt.cz/cgi-bin/mapserv?map=/home/dima/maps/3d_olu/openlandusemap.map&service=WMS&request=GetLegendGraphic&layer=olu_bbox_srid&version=1.3.0&format=image/png&sld_version=1.1.0'],
                    maxResolution: 2.388657133911758,
                    path: 'Open-Land-Use Map',
                    visible: false,
                    opacity: 0.7
                }),
                new ol.layer.Tile({
                    title: "Slope (in degrees)",
                    source: new ol.source.TileWMS({
                        url: 'http://gis.lesprojekt.cz/cgi-bin/mapserv?map=/home/dima/maps/3d_olu/rostenice.map',
                        params: {
                            LAYERS: 'slope',
                            FORMAT: "image/png",
                            INFO_FORMAT: "text/html",
                            minimumTerrainLevel: 14
                        },
                        crossOrigin: null
                    }),
                    legends: ['http://gis.lesprojekt.cz/cgi-bin/mapserv?map=/home/dima/maps/3d_olu/rostenice.map&service=WMS&request=GetLegendGraphic&layer=slope&version=1.3.0&format=image/png&sld_version=1.1.0'],
                    maxResolution: 2.388657133911758,
                    visible: false,
                    opacity: 0.7
                }),
                new ol.layer.Tile({
                    title: "Slope orientation",
                    source: new ol.source.TileWMS({
                        url: 'http://gis.lesprojekt.cz/cgi-bin/mapserv?map=/home/dima/maps/3d_olu/rostenice.map',
                        params: {
                            LAYERS: 'orientation',
                            FORMAT: "image/png",
                            INFO_FORMAT: "text/html",
                            minimumTerrainLevel: 14
                        },
                        crossOrigin: null
                    }),
                    legends: ['http://gis.lesprojekt.cz/cgi-bin/mapserv?map=/home/dima/maps/3d_olu/rostenice.map&service=WMS&request=GetLegendGraphic&layer=orientation&version=1.3.0&format=image/png&sld_version=1.1.0'],
                    maxResolution: 2.388657133911758,
                    visible: false,
                    opacity: 0.7
                }),
                new ol.layer.Tile({
                    title: "Yield potential Rostenice",
                    source: new ol.source.TileWMS({
                        url: 'http://gis.lesprojekt.cz/cgi-bin/mapserv?map=/home/dima/maps/3d_olu/rostenice.map',
                        params: {
                            LAYERS: 'yield_potential',
                            FORMAT: "image/png",
                            INFO_FORMAT: "text/html",
                            minimumTerrainLevel: 14
                        },
                        crossOrigin: null
                    }),
                    legends: ['http://gis.lesprojekt.cz/cgi-bin/mapserv?map=/home/dima/maps/3d_olu/rostenice.map&service=WMS&request=GetLegendGraphic&layer=yield_potential&version=1.3.0&format=image/png&sld_version=1.1.0'],
                    maxResolution: 2.388657133911758,
                    visible: true,
                    opacity: 0.7
                })


            ],
            default_view: new ol.View({
                center: ol.proj.transform([16.8290202, 49.0751890], 'EPSG:4326', 'EPSG:3857'), //Latitude longitude    to Spherical Mercator
                zoom: 15,
                units: "m"
            })
        });

        module.controller('Main', ['$scope', '$compile', '$element', 'Core', 'hs.map.service', 'config',
            function($scope, $compile, $element, Core, OlMap, config) {
                if (console) console.log("Main called");
                $scope.hsl_path = hsl_path; //Get this from hslayers.js file
                $scope.Core = Core;

                Core.panelEnabled('compositions', false);
                Core.panelEnabled('status_creator', false);

                $scope.$on('infopanel.updated', function(event) {});
            }
        ]);

        return module;
    });
