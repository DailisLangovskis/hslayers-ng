import select from 'ol/interaction/Select';
import {click, pointerMove, altKeyOnly} from 'ol/events/condition.js';
import {Fill, Style, Stroke} from 'ol/style';
import collection from 'ol/Collection.js';

export default ['$rootScope', 'hs.map.service','config',
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
                        return layer.values_.selectable.enabled == true ;
                    }
                    else if (layer.values_.selectable.multi == false){
                        if (me.multiFalseStored[layer.ol_uid]) {

                            if (me.multiFalseStored[layer.ol_uid] == feature){
                                delete me.multiFalseStored[layer.ol_uid];
                                return layer.values_.selectable.enabled == true ;
                            }
                            else {
                                me.selectedFeatures.remove(me.multiFalseStored[layer.ol_uid]);
                                me.multiFalseStored[layer.ol_uid] = feature;
                                return layer.values_.selectable.enabled == true ;
                            }
                        }
                        else {
                            me.multiFalseStored[layer.ol_uid] = feature;
                            return layer.values_.selectable.enabled == true ;
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
                    console.log(OlMap)
                    return
                }
            });
        });
    }
]
