define(['ol', 'sparql_helpers'],

    function (ol, sparql_helpers) {
        var src = new ol.source.Vector();
        var $scope;
        var $compile;
        var map;
        var utils;
        var lyr;

        function entityClicked(entity) {
            $scope.showInfo(entity);
            if ($('#zone-info-dialog').length > 0) {
                angular.element('#zone-info-dialog').parent().remove();
            }
            var el = angular.element('<div hs.foodiezones.info-directive></div>');
            $("#hs-dialog-area").append(el);
            $compile(el)($scope);
        }

        src.cesiumStyler = function (dataSource) {
            var entities = dataSource.entities.values;
            for (var i = 0; i < entities.length; i++) {
                var entity = entities[i];
                if (entity.styled) continue;
                var name = entity.properties.code;
                var use = entity.properties.use.getValue();
                entity.polygon.outline = false;
                entity.polygon.material = new Cesium.Color.fromCssColorString('rgba(150, 40, 40, 0.6)');
                entity.styled = true;
                //entity.onclick = entityClicked
            }
        }

        var me = {
            get: function (map, utils, rect) {
                if (lyr.getVisible() == false) return;
                function prepareCords(c) {
                    return c.toString().replaceAll(',', ' ')
                }
                var extents = `POLYGON ((${prepareCords(rect[0])}, ${prepareCords(rect[1])}, ${prepareCords(rect[2])}, ${prepareCords(rect[3])}, ${prepareCords(rect[0])}, ${prepareCords(rect[1])}))`;
                console.log(extents);
                //console.log(extents);
                var q = 'https://www.foodie-cloud.org/sparql?default-graph-uri=&query=' + encodeURIComponent(`

PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
PREFIX virtrdf:	<http://www.openlinksw.com/schemas/virtrdf#> 
PREFIX poi: <http://www.openvoc.eu/poi#> 
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX foodie-cz: <http://foodie-cloud.com/model/foodie-cz#>
PREFIX foodie: <http://foodie-cloud.com/model/foodie#>
PREFIX common: <http://portele.de/ont/inspire/baseInspire#>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX olu: <http://w3id.org/foodie/olu#>
PREFIX af-inspire: <http://inspire.ec.europa.eu/schemas/af/3.0#>

SELECT ?holding ?plot ?code ?shortId ?landUse ?coordPlot
FROM <http://w3id.org/foodie/open/cz/180308_pLPIS_WGS#>
WHERE{ 
    ?holding a foodie:Holding ;
       common:identifier ?identifier_ID_UZ ;
       foodie-cz:inspireIdCodeSpace ?inspireIdCodeSpace ;
       foodie-cz:inspireIdCodeVersion ?inspireIdCodeVersion ;
       af-inspire:contains ?site .
    FILTER(STRSTARTS(STR(?identifier_ID_UZ),"${$scope.iduz}") )
    ?site foodie:containsPlot ?plot .
    ?plot a foodie:Plot ;
       foodie:code ?code ;
       foodie-cz:shortId ?shortId ;
       olu:specificLandUse ?landUse ;
       geo:hasGeometry ?geoPlot .
    ?geoPlot ogcgs:asWKT  ?coordPlot .  
     }

                `) + '&should-sponge=&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on';

                src.set('loaded', false);
                $.ajax({
                    url: utils.proxify(q)
                })
                    .done(function (response) {
                        sparql_helpers.fillFeatures(src, 'coordPlot', response, 'code', {holding: 'holding', plot: 'plot', shortId: 'shortId', code: 'code', use: 'landUse'}, map)
                    })
            },
            createLayer: function () {
                lyr = new ol.layer.Vector({
                    title: "Fields filtered by ID_UZ attribute from LPIS db",
                    source: src,
                    visible: true,
                    style: function (feature, resolution) {
                        return [
                            new ol.style.Style({
                                stroke: new ol.style.Stroke({
                                    color: 'rgba(0, 0, 0, 1)',
                                    width: 2
                                })
                            })
                        ];
                    }
                });
                return lyr;
            },
            getLayer(){
                return lyr;
            },
            init: function (_$scope, _$compile, _map, _utils) {
                $scope = _$scope;
                $compile = _$compile;
                map = _map;
                utils = _utils;
            }
        }
        return me;
    }
)