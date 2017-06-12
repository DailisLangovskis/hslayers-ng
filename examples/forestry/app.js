'use strict';

define(['ol', 'dc', 'sidebar', 'layermanager', 'SparqlJsonForestry', 'query', 'search', 'print', 'permalink', 'measure', 'geolocation', 'legend', 'bootstrap', 'bootstrap', 'api'],

    function(ol, dc, sidebar, layermanager, SparqlJsonForestry) {
        proj4.defs('EPSG:5514', '+title=S-JTSK Krovak +proj=krovak +lat_0=49.5 +lon_0=24.83333333333333 +alpha=30.28813975277778 +k=0.9999 +x_0=0 +y_0=0 +ellps=bessel +units=m +towgs84=570.8,85.7,462.8,4.998,1.587,5.261,3.56 no_defs <>');

        var module = angular.module('hs', [
            'hs.sidebar',
            'hs.layermanager',
            'hs.query',
            'hs.search', 'hs.print', 'hs.permalink',
            'hs.geolocation',
            'hs.legend',
            'hs.api'
        ]);

        module.directive('hs', ['Core', function(Core) {
            return {
                templateUrl: hsl_path + 'hslayers.html',
                link: function(scope, element) {
                    Core.fullScreenMap(element);
                }
            };
        }]);

        var style = function(feature, resolution) {
            if (typeof feature.get('visible') === 'undefined' || feature.get('visible') == true) {
                return [new ol.style.Style({
                    fill: new ol.style.Fill({
                        color: feature.color ? feature.color : [242, 121, 0, 0.7],
                    }),
                    stroke: new ol.style.Stroke({
                        color: "rgba(139, 189, 214, 0.7)",
                    })
                })]
            } else {
                return [];
            }
        }

        var jtskExtent;

        function getTileGrid(projection, extent) {
            var jtsk = ol.proj.get(projection);
            if (projection == 'EPSG:5514')
                jtskExtent = [-905000, -1230000, -400000, -900000];
            if (typeof extent !== 'undefined')
                jtskExtent = extent;
            jtsk.setExtent(jtskExtent);
            var jtskSize = ol.extent.getWidth(jtskExtent) / 256;
            var jtskResolutions = new Array(14);
            var jtskMatrixIds = new Array(14);
            for (var z = 0; z < 14; ++z) {
                jtskResolutions[z] = jtskSize / Math.pow(2, z);
                jtskMatrixIds[z] = z;
            }

            var tileGrid = new ol.tilegrid.WMTS({
                origin: ol.extent.getTopLeft(jtskExtent),
                resolutions: jtskResolutions,
                matrixIds: jtskMatrixIds
            });
            return tileGrid;
        }

        var species = {
            '"DB"@cs': 'dub letní, dub zimní, dub slavonský, dub pýřitý, dub bahenní, dub cer, ostatní duby',
            '"SM"@cs': 'smrk ztepilý',
            '"SMX"@cs': 'smrk: pichlavý, černý, sivý, omorika, Engelmannův, ostatní smrky',
            '"JD"@cs': 'jedle bělokorá',
            '"JDO"@cs': 'jedle obrovská',
            '"BO"@cs': 'borovice lesní, borovice černá, borovice banksovka, borovice vejmutovka, borovice limba, borovice pokroucená, borovice ostatní',
            '"KOS"@cs': 'kosodřevina, borovice blatka',
            '"MD"@cs': 'modřín evropský, ostatní modříny',
            '"DG"@cs': 'douglaska tisolistá',
            '"JX"@cs': 'ostatní jehličnany',
            '"DBC"@cs': 'dub červený',
            '"BK"@cs': 'buk lesní',
            '"HB"@cs': 'habr obecný',
            '"JS"@cs': 'jasan ztepilý, jasan americký, jasan úzkolistý',
            '"J_SUM"@cs': 'Jehličnany – všechny druhy jehličnatých dřevin.',
            '"L_SUM"@cs': 'Listnáče – všechny druhy listnatých dřevin.',
            '"všechny kategorie"@cs': 'Výstup není tříděn dle atributových domén.'
        }
        var specie_lyrs = [];
        angular.forEach(species, function(value, key) {
            specie_lyrs.push(new ol.layer.Vector({
                title: value,
                source: new SparqlJsonForestry({
                    url: 'http://data.plan4all.eu/sparql?default-graph-uri=&query=' + encodeURIComponent('SELECT ?o ?p ?s FROM <http://nil.uhul.cz/lod/species_area/species_area.rdf> FROM <http://nil.uhul.cz/lod/geo/nuts/nuts.rdf> WHERE {{ ?o a <http://nil.uhul.cz/lod/nfi#species_area>. ?o ?p ?s. ?o <http://nil.uhul.cz/lod/nfi#adomain> ' + key + '. ?o <http://www.opengis.net/ont/geosparql#hasGeometry> ?nut. FILTER(?nut != <http://nil.uhul.cz/lod/geo/nuts#CZ0>)} UNION { ?o ?p ?nut. ?nut <http://www.opengis.net/ont/geosparql#asWKT> ?s. ?o <http://nil.uhul.cz/lod/nfi#adomain> ' + key + '. FILTER(?p = <http://www.opengis.net/ont/geosparql#hasGeometry> && ?nut != <http://nil.uhul.cz/lod/geo/nuts#CZ0>) } }') + '&should-sponge=&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on',
                    category_field: 'http://gis.zcu.cz/poi#category_osm',
                    projection: 'EPSG:5514',
                    geometry_attr: 'http://www.opengis.net/ont/geosparql#hasGeometry',
                    value_attr: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value'
                }),
                type: 'vector',
                style: style,
                visible: false,
                path: 'Species area'
            }));
        });

        var zakoni = {
            '"kategorie lesů zvláštního určení"@cs': 'Kategorie lesa dle zákona – lesy zvláštního určení.',
            '"kategorie lesů hospodářských"@cs': 'Kategorie lesa dle zákona – lesy hospodářské.',
            '"kategorie lesů ochranných"@cs': 'Kategorie lesa dle zákona – lesy ochranné.'
        }

        var zakoni_lyrs = [];
        angular.forEach(zakoni, function(value, key) {
            zakoni_lyrs.push(new ol.layer.Vector({
                title: value,
                source: new SparqlJsonForestry({
                    url: 'http://data.plan4all.eu/sparql?default-graph-uri=&query=' + encodeURIComponent('SELECT ?o ?p ?s FROM <http://nil.uhul.cz/lod/lying_dead_timber/lying_dead_timber.rdf> FROM <http://nil.uhul.cz/lod/geo/nuts/nuts.rdf> WHERE {{ ?o a <http://nil.uhul.cz/lod/nfi#lying_dead_timber>. ?o ?p ?s. ?o <http://nil.uhul.cz/lod/nfi#adomain> ' + key + '. ?o <http://www.opengis.net/ont/geosparql#hasGeometry> ?nut. FILTER(?nut != <http://nil.uhul.cz/lod/geo/nuts#CZ0>)} UNION { ?o ?p ?nut. ?nut <http://www.opengis.net/ont/geosparql#asWKT> ?s. ?o <http://nil.uhul.cz/lod/nfi#adomain> ' + key + '. FILTER(?p = <http://www.opengis.net/ont/geosparql#hasGeometry> && ?nut != <http://nil.uhul.cz/lod/geo/nuts#CZ0>) } }') + '&should-sponge=&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on',
                    category_field: 'http://gis.zcu.cz/poi#category_osm',
                    projection: 'EPSG:5514',
                    geometry_attr: 'http://www.opengis.net/ont/geosparql#hasGeometry',
                    value_attr: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value'
                }),
                type: 'vector',
                style: style,
                visible: false,
                path: 'Lying dead timber'
            }));
        });

        var silvicultural = {
            '"tvar lesa nehodnocen"@cs': 'Tvar lesa nehodnocen.',
            '"les vysoký"@cs': 'Vysoký les je charakterizován původem výhradně generativním (síje, sadba, přirozené zmlazení).',
            '"les nízký"@cs': 'Les nízký vzniká systematicky se opakující vegetativní obnovou pařezovými nebo kořenovými výmladky. ',
            '"les střední"@cs': 'Les střední je kombinací lesa vysokého a nízkého - je tvořen spodní výmladkovou etáží doplněnou etáží z generativně založených jedinců.'
        }


        function create1DimensionLayers(domains, title, url, obj) {
            var lyrs = [];
            angular.forEach(domains, function(value, key) {
                lyrs.push(
                    new ol.layer.Vector({
                        title: value,
                        source: new SparqlJsonForestry({
                            url: 'http://data.plan4all.eu/sparql?default-graph-uri=&query=' + encodeURIComponent('SELECT ?o ?p ?s FROM <' + url + '> FROM <http://nil.uhul.cz/lod/geo/nuts/nuts.rdf> WHERE {{ ?o a <http://nil.uhul.cz/lod/nfi#' + obj + '>. ?o ?p ?s. ?o <http://nil.uhul.cz/lod/nfi#adomain> ' + key + '. ?o <http://www.opengis.net/ont/geosparql#hasGeometry> ?nut. FILTER(?nut != <http://nil.uhul.cz/lod/geo/nuts#CZ0>)} UNION { ?o ?p ?nut. ?nut <http://www.opengis.net/ont/geosparql#asWKT> ?s. ?o <http://nil.uhul.cz/lod/nfi#adomain> ' + key + '. FILTER(?p = <http://www.opengis.net/ont/geosparql#hasGeometry> && ?nut != <http://nil.uhul.cz/lod/geo/nuts#CZ0>) } }') + '&should-sponge=&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on',
                            category_field: 'http://gis.zcu.cz/poi#category_osm',
                            projection: 'EPSG:5514',
                            geometry_attr: 'http://www.opengis.net/ont/geosparql#hasGeometry',
                            value_attr: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value'
                        }),
                        type: 'vector',
                        style: style,
                        visible: false,
                        path: title
                    }));
            });
            return lyrs;
        }


        function createOneDimensionLayer(title, url, obj, dataset_url, geometry_attr, value_attr) {
            return new ol.layer.Vector({
                title: title,
                source: new SparqlJsonForestry({
                    url: 'http://data.plan4all.eu/sparql?default-graph-uri=&query=' + encodeURIComponent('SELECT ?o ?p ?s FROM <' + url + '> FROM <http://nil.uhul.cz/lod/ns/nuts.rdf> WHERE {{ ?o a <' + dataset_url + obj + '>. ?o ?p ?s. ?o <' + geometry_attr + '> ?nut. FILTER(?nut != <http://nil.uhul.cz/lod/ns/nuts#CZ0>)} UNION { ?o ?p ?nut. ?nut <http://www.opengis.net/ont/geosparql#asWKT> ?s. FILTER(?p = <' + geometry_attr + '> && ?nut != <http://nil.uhul.cz/lod/ns/nuts#CZ0>) } }') + '&should-sponge=&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on',
                    category_field: 'http://gis.zcu.cz/poi#category_osm',
                    projection: 'EPSG:5514',
                    geometry_attr: geometry_attr,
                    value_attr: value_attr
                }),
                type: 'vector',
                style: style,
                visible: false
            })
        }

        module.value('config', {
            box_layers: [new ol.layer.Group({
                title: '',
                layers: [
                        new ol.layer.Tile({
                            title: "BaseMap",
                            source: new ol.source.TileWMS({
                                url: "http://geoportal.gov.cz/arcgis/services/CENIA/cenia_rt_automapy/MapServer/WMSServer",
                                params: {
                                    LAYERS: '3',
                                    INFO_FORMAT: 'application/vnd.ogc.wms_xml',
                                    FORMAT: "image/png"
                                },
                                crossOrigin: null
                            }),
                            visible: true
                        }),

                        new ol.layer.Tile({
                            title: "Ortofoto",
                            source: new ol.source.WMTS({
                                format: "image/jpeg",
                                layer: "orto",
                                matrixSet: "jtsk:epsg:5514",
                                projection: ol.proj.get('EPSG:5514'),
                                style: 'inspire_common:DEFAULT',
                                tileGrid: getTileGrid('EPSG:5514', [-925000.000000000000, -1444353.535999999800, -400646.464000000040, -920000.000000000000]),
                                url: "http://geoportal.cuzk.cz/WMTS_ORTOFOTO/WMTService.aspx",
                                version: "1.0.0",
                                extent: jtskExtent,
                            }),
                            visible: false
                        }),
                        //Czech flat data                                   
                        createOneDimensionLayer('CZ Forest cover', 'http://nil.uhul.cz/lod/nfi/forest_cover/FC2001-2004.ttl', 'ObForestCover', 'http://nil.uhul.cz/lod/ns/nfi#', 'http://nil.uhul.cz/lod/ns/nfi#refArea', 'http://nil.uhul.cz/lod/ns/nfi#percentArea'),
                        createOneDimensionLayer('CZ Average growing stock per hectare', 'http://nil.uhul.cz/lod/nfi/average_growing_stock/AGS2001-2004.rdf', 'ObAvGrowingStockPerHa', 'http://nil.uhul.cz/lod/ns/nfi#', 'http://nil.uhul.cz/lod/ns/nfi#refArea', 'http://nil.uhul.cz/lod/ns/nfi#cubicMetrePerHa'),
                        createOneDimensionLayer('CZ Total forest area', 'http://nil.uhul.cz/lod/nfi/total_forest_area/TFA2001-2004.rdf', 'ObTotalForestArea', 'http://nil.uhul.cz/lod/ns/nfi#', 'http://nil.uhul.cz/lod/ns/nfi#refArea', 'http://www.w3.org/2015/03/inspire/smod#areaHa'),
                        createOneDimensionLayer('CZ Total growing stock', 'http://nil.uhul.cz/lod/nfi/total_growing_stock/GS2001-2004.rdf', 'ObGrowingStock', 'http://nil.uhul.cz/lod/ns/nfi#', 'http://nil.uhul.cz/lod/ns/nfi#refArea', 'http://nil.uhul.cz/lod/ns/nfi#cubicMetres'),
                        //Slovakian flat data                                   
                        createOneDimensionLayer('SK Forest cover', 'http://nil.uhul.cz/smod/niml/forest_cover/FC2005-2006.rdf', 'ObForestCover', 'http://nil.uhul.cz/lod/ns/nfi#', 'http://nil.uhul.cz/lod/ns/nfi#refArea', 'http://nil.uhul.cz/lod/ns/nfi#percentArea'),
                        createOneDimensionLayer('SK Average growing stock per hectare', 'http://nil.uhul.cz/smod/niml/average_growing_stock/AGS2005-2006.rdf', 'ObAvGrowingStockPerHa', 'http://nil.uhul.cz/lod/ns/nfi#', 'http://nil.uhul.cz/lod/ns/nfi#refArea', 'http://nil.uhul.cz/lod/ns/nfi#cubicMetrePerHa'),
                        createOneDimensionLayer('SK Total forest area', 'http://nil.uhul.cz/smod/niml/total_forest_area/TFA2005-2006.rdf', 'ObTotalForestArea', 'http://nil.uhul.cz/lod/ns/nfi#', 'http://nil.uhul.cz/lod/ns/nfi#refArea', 'http://www.w3.org/2015/03/inspire/smod#areaHa'),
                        createOneDimensionLayer('SK Total growing stock', 'http://nil.uhul.cz/smod/niml/total_growing_stock/GS2005-2006.rdf', 'ObGrowingStock', 'http://nil.uhul.cz/lod/ns/nfi#', 'http://nil.uhul.cz/lod/ns/nfi#refArea', 'http://nil.uhul.cz/lod/ns/nfi#cubicMetres'),
                    ].concat(specie_lyrs).concat(zakoni_lyrs).concat(create1DimensionLayers(silvicultural, 'Silvicultural system', 'http://nil.uhul.cz/lod/silvicultural_system/silvicultural_system.rdf', 'silvicultural_system'))
                    .concat(create1DimensionLayers({
                        '"les nízký"@cs': 'Les nízký vzniká systematicky se opakující vegetativní obnovou pařezovými nebo kořenovými výmladky. ',
                        '"tvar lesa nehodnocen"@cs': 'Tvar lesa nehodnocen.',
                        '"les vysoký"@cs': 'Vysoký les je charakterizován původem výhradně generativním (síje, sadba, přirozené zmlazení).',
                        '"les střední"@cs': 'Les střední je kombinací lesa vysokého a nízkého - je tvořen spodní výmladkovou etáží doplněnou etáží z generativně založených jedinců.'
                    }, 'Stand richness', 'http://nil.uhul.cz/lod/stand_richness/stand_richness.rdf', 'stand_richness'))

                    .concat(create1DimensionLayers({
                    '"věkový stupeň 15"@cs': 'Věkový stupeň 15 – věk 141 až 150 let',
                    '"věkový stupeň 1"@cs': 'Věkový stupeň 1 – věk 1 až 10 let',
                    '"věkový stupeň 2"@cs': 'Věkový stupeň 2 – věk 11 až 20 let',
                    '"věkový stupeň 3"@cs': 'Věkový stupeň 3 – věk 21 až 30 let',
                    '"věkový stupeň 4"@cs': 'Věkový stupeň 4 – věk 31 až 40 let',
                    '"věkový stupeň 5"@cs': 'Věkový stupeň 5 – věk 41 až 50 let',
                    '"věkový stupeň 6"@cs': 'Věkový stupeň 6 – věk 51 až 60 let',
                    '"věkový stupeň 7"@cs': 'Věkový stupeň 7 – věk 61 až 70 let',
                    '"věkový stupeň 8"@cs': 'Věkový stupeň 8 – věk 71 až 80 let',
                    '"věkový stupeň 9"@cs': 'Věkový stupeň 9 – věk 81 až 90 let',
                    '"věkový stupeň 10"@cs': 'Věkový stupeň 10 – věk 91 až 100 let',
                    '"věkový stupeň 11"@cs': 'Věkový stupeň 11 – věk 101 až 110 let',
                    '"věkový stupeň 12"@cs': 'Věkový stupeň 12 – věk 111 až 120 let',
                    '"věkový stupeň 13"@cs': 'Věkový stupeň 13 – věk 121 až 130 let',
                    '"věkový stupeň 14"@cs': 'Věkový stupeň 14 – věk 131 až 140 let',
                    '"věkový stupeň 16"@cs': 'Věkový stupeň 16 – věk 151 až 160 let',
                    '"věkový stupeň 17"@cs': 'Věkový stupeň 17+ – věk 161 a více let'
                }, 'Vegetation tiers', 'http://nil.uhul.cz/lod/vegetation_tiers/vegetation_tiers.rdf', 'vegetation_tiers'))
            })],
            default_view: new ol.View({
                center: ol.proj.transform([15.2, 49.9], 'EPSG:4326', 'EPSG:5514'),
                zoom: 1,
                maxZoom: 3,
                projection: ol.proj.get('EPSG:5514'),
                units: "m"
            })
        });

        module.controller('Main', ['$scope', '$filter', 'Core', 'hs.map.service', 'hs.query.service_infopanel',
            function($scope, $filter, Core, OlMap, InfoPanelService) {
                if (console) console.log("Main called");
                $scope.hsl_path = hsl_path; //Get this from hslayers.js file
                $scope.Core = Core;
            }
        ]);

        return module;
    });
