import { Tile, Group } from 'ol/layer';
import ImageLayer from 'ol/layer/Image';
import VectorLayer from 'ol/layer/Vector';
import SparqlJson from 'hs.source.SparqlJson'
import 'config_parsers';
import select from 'ol/interaction/Select';
import {click, pointerMove, altKeyOnly} from 'ol/events/condition.js';
import {Fill, Style, Stroke} from 'ol/style';
import map from 'ol/Map'; 
import feature from 'ol/Feature.js';
import collection from 'ol/Collection.js';


/**
 * @ngdoc module
 * @module hs.layermanager
 * @name hs.layermanager
 * @description Layer manager module maintain management of layers loaded in HS Layers application. It use folder structure to enable building hiearchy of layers. All layers are wrapped inside HSLayer object, which contain auxilary informations and layer itself.
 */
export default {
    //TODO rewrite this
    init() {
        angular.module('hs.layermanager')
            /**
             * @module hs.layermanager
             * @name hs.layermanager.service
             * @ngdoc service
             * @description TODO
             */
            .service('hs.layermanager.selection.service', ['$rootScope', 'hs.map.service','config',
                function ($rootScope, OlMap, config) {
                    var me = this;

                    this.selectedFeatures = new collection();
                    this.multiFalseStored = {};

                    let selectStyle = new Style({
                        fill: new Fill({
                            color: "rgba(108, 184, 222, 0.1)",
                        }),
                        stroke: new Stroke({
                            color: '#00ffe2',
                            width: 2
                        })
                    });

                    me.selector = new select({ 
                        condition: click,
                        toggleCondition: click,
                        filter: function(feature, layer) {
                            if(layer.values_.selectable){
                                if (layer.values_.selectable.multi === true){
                                    return layer.values_.selectable.possibility == true ;
                                }
                                else if (layer.values_.selectable.multi == false){
                                    if (me.multiFalseStored[layer.ol_uid]) {

                                        if (me.multiFalseStored[layer.ol_uid] == feature){
                                            delete me.multiFalseStored[layer.ol_uid];
                                            return layer.values_.selectable.possibility == true ;
                                        }
                                        else {
                                            me.selectedFeatures.remove(me.multiFalseStored[layer.ol_uid]);
                                            me.multiFalseStored[layer.ol_uid] = feature;
                                            return layer.values_.selectable.possibility == true ;
                                        }
                                    }
                                    else {
                                        me.multiFalseStored[layer.ol_uid] = feature;
                                        return layer.values_.selectable.possibility == true ;
                                    }

                                }
                                else { return false} 
                                }
                            else {
                                return false
                            }
                        },
                        style: selectStyle, 
                        features: me.selectedFeatures,
                    });
                    $rootScope.$on('map.loaded', function () {
                        OlMap.map.getLayers().forEach(layer => {
                            if (layer.values_.selectable !== undefined){
                                OlMap.map.addInteraction(me.selector);
                                return
                            }
                        });
                    });
                }
            ])
    }
};
