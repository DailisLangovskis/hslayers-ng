import VectorLayer from 'ol/layer/Vector';
import { Vector } from 'ol/source';

export default {
    template: require('components/layermanager/partials/layermanager.html'),
    controller: ['$scope', 'Core', '$compile', 'hs.utils.service',
        'hs.utils.layerUtilsService', 'config', 'hs.map.service',
        'hs.layermanager.service', '$rootScope', 'hs.layermanager.WMSTservice',
        'hs.legend.service',
        function ($scope, Core, $compile, utils, layerUtils, config, OlMap,
            LayMan, $rootScope, WMST, legendService) {
            $scope.data = LayMan.data;
            $scope.Core = Core;
            $scope.utils = utils;
            var map;
            $scope.shiftDown = false;          
            $scope.changeLayerVisibility = LayMan.changeLayerVisibility;
            $scope.changeBaseLayerVisibility = LayMan.changeBaseLayerVisibility;
            $scope.changeTerrainLayerVisibility = LayMan.changeTerrainLayerVisibility;

            $scope.layerOrder = function (layer) {
                return layer.layer.get('position')
            }

            $scope.changePosition = function (layer, direction, $event) {
                var index = layer.layer.get('position');
                var layers = OlMap.map.getLayers();
                var toIndex = index;
                if (direction) {// upwards
                    var max = layers.getLength() - 1;
                    if (index < max) {
                        if ($event.shiftKey) toIndex = max;
                        else toIndex = index + 1;
                    }
                }
                else {//downwards
                    var min;
                    for (var i = 0; i < layers.getLength(); i++) {
                        if (layers.item(i).get('base') != true) {
                            min = i;
                            break;
                        }
                    }
                    if (index > min) {
                        if ($event.shiftKey) toIndex = min;
                        else toIndex = index - 1;
                    }
                }
                var moveLayer = layers.item(index);
                layers.removeAt(index);
                layers.insertAt(toIndex, moveLayer);
                LayMan.updateLayerOrder();
                $rootScope.$broadcast('layermanager.updated'); //Rebuild the folder contents
            }          

            $scope.isLayerType = function (layer, type) {
                switch (type) {
                    case 'wms':
                        return LayMan.isWms(layer);
                    case 'point':
                        return layer.getSource().hasPoint;
                    case 'line':
                        return layer.getSource().hasLine;
                    case 'polygon':
                        return layer.getSource().hasPoly;
                    default:
                        return false;
                }
            }

            $scope.setProp = function (layer, property, value) {
                layer.set(property, value);
            }                  

            $scope.changePointType = function (layer, type) {
                if (angular.isUndefined(layer.style)) getLayerStyle(layer);
                layer.style.pointType = type;
                setLayerStyle(layer);
            }

            $scope.icons = ["bag1.svg", "banking4.svg", "bar.svg", "beach17.svg", "bicycles.svg", "building103.svg", "bus4.svg", "cabinet9.svg", "camping13.svg", "caravan.svg", "church15.svg", "church1.svg", "coffee-shop1.svg", "disabled.svg", "favourite28.svg", "football1.svg", "footprint.svg", "gift-shop.svg", "gps40.svg", "gps41.svg", "gps42.svg", "gps43.svg", "gps5.svg", "hospital.svg", "hot-air-balloon2.svg", "information78.svg", "library21.svg", "location6.svg", "luggage13.svg", "monument1.svg", "mountain42.svg", "museum35.svg", "park11.svg", "parking28.svg", "pharmacy17.svg", "port2.svg", "restaurant52.svg", "road-sign1.svg", "sailing-boat2.svg", "ski1.svg", "swimming26.svg", "telephone119.svg", "toilets2.svg", "train-station.svg", "university2.svg", "warning.svg", "wifi8.svg"];

            $scope.activateTheme = LayMan.activateTheme;

            /**
             * @function toggleCurrentLayer
             * @memberOf hs.layermanager.controller
             * @description Opens detailed panel for manipulating selected layer and viewing metadata
             * @param {object} layer Selected layer to edit or view - Wrapped layer object 
             * @param {number} index Position of layer in layer manager structure - used to position the detail panel after layers li element
             */

            $scope.setCurrentLayer = function (layer, index, path) {
                LayMan.currentLayer = layer;
                $scope.currentLayer = LayMan.currentLayer;
                if (WMST.layerIsWmsT(layer)) {
                    LayMan.currentLayer.time = new Date(layer.layer.getSource().getParams().TIME);
                    LayMan.currentLayer.date_increment = LayMan.currentLayer.time.getTime();
                }
                var layerPanel = document.getElementsByClassName('layerpanel');
                var layerNode = document.getElementById('layer' + (path || '') + (index || ''));
                utils.insertAfter(layerPanel, layerNode);
                $scope.legendDescriptors = [];
                var tmpDescriptor = (layer ? legendService.getLayerLegendDescriptor(layer.layer) : false);
                if (tmpDescriptor) $scope.legendDescriptors.push(tmpDescriptor);
                $scope.cur_layer_opacity = layer.layer.getOpacity();
                return false;
            }

            $scope.currentLayer = LayMan.currentLayer;
            $scope.toggleCurrentLayer = function (layer, index, path) {
                if (LayMan.currentLayer == layer) {
                    LayMan.currentLayer = null;
                } else {
                    $scope.setCurrentLayer(layer, index, path)
                }
                $scope.currentLayer = LayMan.currentLayer;
                return false;
            }

            /**
           * @function removeLayer
           * @memberOf hs.layermanager.controller
           * @description Removes layer from map object
           * @param {Ol.layer} layer Layer to remove
           */
            $scope.removeLayer = function (layer) {
                map.removeLayer(layer);
            }

            /** 
             * @function dragged
             * @memberOf hs.layermanager.controller
             * @param {unknow} event
             * @param {unknown} index
             * @param {unknown} item
             * @param {unknown} type
             * @param {unknown} external
             * @param {Array} layerTitles Array of layer titles of group in which layer should be moved in other position
             * Callback for dnd-drop event to change layer position in layer manager structure (drag and drop action with layers in layer manager - see https://github.com/marceljuenemann/angular-drag-and-drop-lists for more info about dnd-drop). 
             * This is called from layerlistDirective
             */
            $scope.draggedCont = function (event, index, item, type, external, layerTitles) {
                if (layerTitles.indexOf(item) < index) index--; //Must take into acount that this item will be removed and list will shift
                var to_title = layerTitles[index];
                var to_index = null;
                var item_index = null;
                var layers = OlMap.map.getLayers();
                //Get the position where to drop the item in the map.getLayers list and which item to remove. because we could be working only within a folder so layer_titles is small
                for (var i = 0; i < layers.getLength(); i++) {
                    if (layers.item(i).get('title') == to_title) to_index = i;
                    if (layers.item(i).get('title') == item) item_index = i;
                    if (index > layerTitles.length) to_index = i + 1; //If dragged after the last item
                }
                var item_layer = layers.item(item_index);
                map.getLayers().removeAt(item_index);
                map.getLayers().insertAt(to_index, item_layer);
                LayMan.updateLayerOrder();
                $rootScope.$broadcast('layermanager.updated'); //Rebuild the folder contents
            }           

            /**
             * @function removeAllLayers
             * @memberOf hs.layermanager.controller
             * @description Removes all layers which don't have 'removable' attribute set to false. If removal wasn´t confirmed display dialog first. Might reload composition again
             * @param {Boolean} confirmed Whether removing was confirmed (by user/code), (true for confirmed, left undefined for not)
             * @param {Boolean} loadComp Whether composition should be loaded again (true = reload composition, false = remove without reloading)
             */
            $scope.removeAllLayers = function (confirmed, loadComp) {
                if (typeof confirmed == 'undefined') {
                    if (document.getElementById("hs-remove-all-dialog") == null) {
                        var el = angular.element('<div hs.layermanager.remove_all_dialog_directive></div>');
                        document.getElementById("hs-dialog-area").appendChild(el[0]);
                        $compile(el)($scope);
                    } else {
                        $scope.removeAllModalVisible = true;
                    }
                    return;
                }

                LayMan.removeAllLayers();

                if (loadComp == true) {
                    $rootScope.$broadcast('compositions.load_composition', $scope.composition_id);
                }
            }

            /**
             * @function isLayerQueryable
             * @memberOf hs.layermanager.controller
             * @param {object} layer_container Selected layer - wrapped in layer object
             * @description Test if layer is queryable (WMS layer with Info format)
             */
            $scope.isLayerQueryable = function (layer_container) {
                layerUtils.isLayerQueryable(layer_container.layer);
            }

            /**
             * @function hasBoxLayers
             * @memberOf hs.layermanager.controller
             * @description Test if box layers are loaded
             */
            $scope.hasBoxImages = function () {
                if (angular.isDefined($scope.data.box_layers)) {
                    for (var i = 0; i < $scope.data.box_layers.length; i++) {
                        if ($scope.data.box_layers[i].get('img')) return true;
                    }
                }
                return false;
            }

            /**
             * @function isLayerInResolutionInterval
             * @memberOf hs.layermanager.controller
             * @param {Ol.layer} lyr Selected layer
             * @description Test if layer (WMS) resolution is within map resolution interval 
             */
            $scope.isLayerInResolutionInterval = LayMan.isLayerInResolutionInterval;    
           
            /**
             * @function layerLoaded
             * @memberOf hs.layermanager.controller
             * @param {Ol.layer} layer Selected layer
             * @description Test if selected layer is loaded in map
             */
            $scope.layerLoaded = layerUtils.layerLoaded;

            /**
             * @function layerValid
             * @memberOf hs.layermanager.controller
             * @param {Ol.layer} layer Selected layer
             * @description Test if selected layer is valid (true for invalid)
             */
            $scope.layerValid = layerUtils.layerInvalid;


            $scope.setLayerTime = WMST.setLayerTime;

            $scope.dimensionChanged = function (currentlayer, dimension) {
                $scope.$emit('layermanager.dimension_changed', { layer: currentlayer.layer, dimension: dimension });
            }

            $scope.$on('layer.removed', function (event, layer) {
                if (angular.isObject(LayMan.currentLayer) && (LayMan.currentLayer.layer == layer)) {
                    var layerPanel = document.getElementsByClassName('layerpanel');
                    var layerNode = document.getElementsByClassName('hs-lm-mapcontentlist')[0];
                    utils.insertAfter(layerPanel, layerNode);
                    LayMan.currentLayer = null;
                    $scope.currentLayer = LayMan.currentLayer;
                }
            });

            $scope.$on('compositions.composition_loaded', function (event, data) {
                if (angular.isUndefined(data.error)) {
                    if (angular.isDefined(data.data) && angular.isDefined(data.data.id)) {
                        $scope.composition_id = data.data.id;
                    } else if (angular.isDefined(data.id)) {
                        $scope.composition_id = data.id;
                    } else {
                        delete $scope.composition_id;
                    }
                }
            });

            $scope.$on('compositions.composition_deleted', function (event, composition) {
                if (composition.id == $scope.composition_id) {
                    delete $scope.composition_id;
                }
            });

            $scope.$on('core.map_reset', function (event) {
                $timeout(function () {
                    delete $scope.composition_id;
                })
            });

            function init() {
                map = OlMap.map;
            }

            OlMap.loaded().then(init);

            $scope.$emit('scope_loaded', "LayerManager");
        }
    ]
}