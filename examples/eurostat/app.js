'use strict';

define(['angular', 'ol', 'toolbar', 'layermanager', 'map', 'query', 'search', 'print', 'permalink', 'lodexplorer', 'measure', 'geolocation'],

    function(angular, ol, toolbar, layermanager) {
        var module = angular.module('hs', [
            'hs.toolbar',
            'hs.layermanager',
            'hs.map',
            'hs.query',
            'hs.search', 'hs.print', 'hs.permalink', 'hs.lodexplorer',
            'hs.geolocation'
        ]);

        module.directive('hs', ['OlMap', '$window', function(OlMap, $window) {
            return {
                templateUrl: hsl_path + 'hslayers.html',
                link: function(scope, element) {
                    var w = angular.element($window);
                    w.bind('resize', function() {
                        element[0].style.height = w.height() + "px";
                        element[0].style.width = w.width() + "px";
                        $("#map").height(w.height());
                        $("#map").width(w.width());
                        OlMap.map.updateSize()
                    });
                    w.resize();
                }
            };
        }]);
        
         module.value('box_layers', []);

        module.value('default_layers', [
            new ol.layer.Tile({
                source: new ol.source.OSM(),
                title: "Base layer",
                box_id: 'osm',
                base: true
            })
        ]);

        module.value('default_view', new ol.View({
            center: ol.proj.transform([17.474129, 52.574000], 'EPSG:4326', 'EPSG:3857'), //Latitude longitude    to Spherical Mercator
            zoom: 4,
            units: "m"
        }));




        module.controller('Main', ['$scope', 'ToolbarService', 'InfoPanelService',
            function($scope, ToolbarService, OwsWmsLayerProducer, InfoPanelService) {
                if (console) console.log("Main called");
                $scope.hsl_path = hsl_path; //Get this from hslayers.js file
                $scope.ToolbarService = ToolbarService;

                $scope.$on('infopanel.updated', function(event) {
                });
            }
        ]);

        return module;
    });