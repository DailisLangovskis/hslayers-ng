'use strict';

define(['ol', 'toolbar', 'layermanager', 'geojson', 'pois', 'olus', 'stations', 'character', 'sidebar', 'query', 'print', 'permalink', 'measure', 'geolocation', 'api', 'cesium', 'ows', 'cesiumjs', 'bootstrap', 'panel'],

    function (ol, toolbar, layermanager, geojson, pois, olus, stations, character) {
        var module = angular.module('hs', [
            'hs.layermanager',
            'hs.query',
            'hs.print', 'hs.permalink',
            'hs.geolocation',
            'hs.cesium',
            'hs.sidebar',
            'hs.rogainonline'
        ]);

        module.directive('hs', ['hs.map.service', 'Core', '$compile', '$timeout', function (OlMap, Core, $compile, $timeout) {
            return {
                templateUrl: hsl_path + 'hslayers.html',
                link: function (scope, element) {
                    angular.element('.page-content', element).append($compile('<div hs.cesium.directive ng-controller="hs.cesium.controller"></div>')(scope));
                    $timeout(function () { Core.fullScreenMap(element) }, 0);
                }
            };
        }]);

        module.directive('hs.enddialog', function () {
            function link(scope, element, attrs) {
                setTimeout(function () {
                    $('#end-dialog').modal('show');
                }, 1500);
            }
            return {
                templateUrl: './end.html?bust=' + gitsha,
                link: link
            };
        });

        module.directive('hs.hud', function () {
            return {
                templateUrl: './hud.html?bust=' + gitsha,
                link: function (scope, element, attrs) {

                }
            };
        })


        module.directive('hs.foodiezones.infoDirective', function () {
            return {
                templateUrl: './info.html?bust=' + gitsha,
                link: function (scope, element, attrs) {
                    $('#zone-info-dialog').modal('show');
                }
            };
        })

        module.directive('description', ['$compile', 'hs.utils.service', function ($compile, utils) {
            return {
                templateUrl: './description.html?bust=' + gitsha,
                scope: {
                    object: '=',
                    url: '@'
                },
                link: function (scope, element, attrs) {
                    scope.describe = function (e, attribute) {
                        if (angular.element(e.target).parent().find('table').length > 0) {
                            angular.element(e.target).parent().find('table').remove();
                        } else {
                            var table = angular.element('<table class="table table-striped" description object="attribute' + Math.abs(attribute.value.hashCode()) + '" url="' + attribute.value + '"></table>');
                            angular.element(e.target).parent().append(table);
                            $compile(table)(scope.$parent);
                        }
                    }
                    if (angular.isUndefined(scope.object) && angular.isDefined(attrs.url) && typeof attrs.url == 'string') {
                        scope.object = { attributes: [] };
                        var q = 'https://www.foodie-cloud.org/sparql?default-graph-uri=&query=' + encodeURIComponent('describe <' + attrs.url + '>') + '&should-sponge=&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on';
                        $.ajax({
                            url: utils.proxify(q)
                        })
                            .done(function (response) {
                                if (angular.isUndefined(response.results)) return;
                                for (var i = 0; i < response.results.bindings.length; i++) {
                                    var b = response.results.bindings[i];
                                    var short_name = b.p.value;
                                    if (short_name.indexOf('#') > -1)
                                        short_name = short_name.split('#')[1];
                                    scope.object.attributes.push({ short_name: short_name, value: b.o.value });
                                    if (!scope.$$phase) scope.$apply();
                                }
                            })
                    }
                }
            };
        }]);

        module.value('config', {
            terrain_provider: 'https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles',
            terrain_providers: [{
                title: 'EU-DEM',
                url: 'https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles',
                active: true
            }],
            cesiumInfoBox: false,
            default_layers: [
                new ol.layer.Tile({
                    source: new ol.source.OSM(),
                    title: "OpenStreetMap",
                    base: true,
                    visible: false,
                    minimumTerrainLevel: 15
                }),
                //pois.createPoiLayer(),
                olus.createOluLayer(),
                stations.createLayer()
            ],
            default_view: new ol.View({
                center: ol.proj.transform([1208534.8815206578, 5761821.705531779], 'EPSG:3857', 'EPSG:4326'),
                zoom: 16,
                units: "m",
                projection: 'EPSG:4326'
            })
        });

        module.controller('Main', ['$scope', '$compile', '$element', 'Core', 'hs.map.service', 'config', '$rootScope', 'hs.utils.service', '$sce', '$timeout', 'hs.geolocation.service', 'Socialshare', 'hs.permalink.service_url', '$http',
            function ($scope, $compile, $element, Core, hs_map, config, $rootScope, utils, $sce, $timeout, geolocation, socialshare, permalink_service, $http) {
                var map;
                var viewer;
                var last_time = 0;
                var last_hud_updated = 0;
                var last_run_counted = 0;
                var zero_date = new Date(2000, 1, 0, 0, 0, 0, 0, 1);
                var full_date = new Date(2000, 1, 0, 4, 30, 0, 0);
                var running_start_date = new Date(2000, 1, 0, 4, 0, 0, 0);
                var time_game_started;
                var last_measure_pick, last_run_position = null;
                var planning_line_segments = [];
                var running_line_segments = [];
                var distance_counter_timer = null;

                $scope.hsl_path = hsl_path; //Get this from hslayers.js file
                $scope.Core = Core;
                Core.singleDatasources = true;
                Core.panelEnabled('compositions', false);
                Core.panelEnabled('status_creator', false);
                Core.panelEnabled('print', false);
                Core.panelEnabled('layermanager', false);
                Core.sidebarExpanded = false;
                Core.classicSidebar = false;
                $scope.time_remaining = new Date(2000, 1, 0, 4, 30, 0, 0);
                $scope.points_collected = 0;
                pois.init($scope, $compile);
                stations.init($scope, $compile, olus);
                $scope.game_state = 'before_game';
                $scope.game_mode = Core.isMobile() ? 'real' : 'virtual';
                $scope.time_penalty = 0;
                $scope.ajax_loader = hsl_path + 'img/ajax-loader.gif';
                $scope.time_multiplier = Core.isMobile() ? 1 : 10;
                Core.setDefaultPanel('rogainonline');
                Core.sidebarExpanded = false;

                function createHud() {
                    var el = angular.element('<div hs.hud></div>');
                    $(".page-content").append(el);
                    $compile(el)($scope);
                }

                function disableRightMouse(scene) {
                    var screenSpaceEventHandler = viewer.screenSpaceEventHandler;
                    screenSpaceEventHandler.setInputAction(function () {
                        scene.screenSpaceCameraController.enableZoom = false;
                    }, Cesium.ScreenSpaceEventType.RIGHT_DOWN);

                    screenSpaceEventHandler.setInputAction(function () {
                        scene.screenSpaceCameraController.enableZoom = true;
                    }, Cesium.ScreenSpaceEventType.RIGHT_UP);

                    screenSpaceEventHandler.setInputAction(function () {
                        character.userInputing(true)
                    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

                    screenSpaceEventHandler.setInputAction(function () {
                        character.userInputing(false)
                    }, Cesium.ScreenSpaceEventType.LEFT_UP);

                    screenSpaceEventHandler.setInputAction(function () {
                        character.userInputing(true)
                    }, Cesium.ScreenSpaceEventType.PINCH_START);

                    screenSpaceEventHandler.setInputAction(function () {
                        character.userInputing(false)
                    }, Cesium.ScreenSpaceEventType.PINCH_END);

                    screenSpaceEventHandler.setInputAction(function () {
                        character.userInputing(false)
                    }, Cesium.ScreenSpaceEventType.WHEEL);
                }

                $scope.$on("scope_loaded", function (event, args) {
                    if (args == 'Sidebar') {
                        var el = angular.element('<div id="test3" hs.rogainonline.panel_directive></div>');
                        angular.element('#panelplace').append(el);
                        $compile(el)($scope);
                    }
                })

                function startRunning() {
                    $scope.game_started = true;
                    if(distance_counter_timer!=null) clearInterval(distance_counter_timer);
                    distance_counter_timer = setInterval(countRunDistance, 2000 / $scope.time_multiplier);
                    $scope.game_state = 'running';
                    character.flyToInitialLocation();
                    playGo();
                }

                function tick(timestamp) {
                    if (timestamp) {
                        var time_ellapsed = timestamp - last_time;
                        if ($scope.game_started) {
                            $scope.time_remaining = full_date - (timestamp - time_game_started) * $scope.time_multiplier;
                            if ($scope.time_remaining <= running_start_date && $scope.game_state == 'planning') {
                                startRunning()
                            }
                            if ($scope.time_remaining <= zero_date) {
                                $scope.time_remaining = zero_date;
                                $scope.time_penalty = Math.ceil((zero_date - (full_date - (timestamp - time_game_started) * $scope.time_multiplier)) / 60000);
                            }
                        }

                        character.positionCharacter(time_ellapsed, timestamp);
                        last_time = timestamp;
                        updHud();
                    }
                    Cesium.requestAnimationFrame(tick);
                }

                var bad_rednering_detected_time = null;
                var rendering_resolution_reduced = false;
                function updHud() {
                    if (last_time - last_hud_updated < 500) return;
                    last_hud_updated = last_time;
                    checkBadPerformance();
                    if (!$scope.$$phase) $scope.$apply();
                }

                function checkBadPerformance() {
                    if (!rendering_resolution_reduced && parseFloat($('.cesium-performanceDisplay-fps').html()) < 20) {
                        if (bad_rednering_detected_time == null) {
                            bad_rednering_detected_time = last_time;
                        }
                        if (last_time - bad_rednering_detected_time > 6000 && devicePixelRatio != 1) {
                            alert('Reducing the resolution due to bad rendering performance ');
                            viewer.resolutionScale = 1.0 / devicePixelRatio;
                            bad_rednering_detected_time = null;
                            rendering_resolution_reduced = true;
                        }
                    } else {
                        bad_rednering_detected_time = null;
                    }
                }

                function countRunDistance() {
                    if ($scope.game_state != 'running') return;
                    if (last_time - last_run_counted < 500) return;
                    last_run_counted = last_time;
                    addRunPosition(character.currentPos());
                }

                createHud();

                $scope.createNewMap = function (hours) {
                    $scope.game_started = true;
                    $scope.game_state = 'generating';
                    if (!$scope.$$phase) $scope.$apply();
                    $timeout(function () {
                        $scope.points_collected = 0;
                        full_date = new Date(2000, 1, 0, hours, 30, 0, 0);
                        running_start_date = new Date(2000, 1, 0, hours, 0, 0, 0);
                        time_game_started = last_time;
                        stations.createStations(map, utils, character.currentPos(), function (bounds) {
                            $scope.game_state = 'planning';
                            last_measure_pick = character.currentPos();
                            flyToWholeMapView(hours, bounds);
                        }, hours);
                    }, 0)
                }

                function flyToWholeMapView(hours, bounds) {
                    var pos_lon_lat = character.currentPos();
                    var needed = viewer.camera.getRectangleCameraCoordinates(new Cesium.Rectangle.fromDegrees(bounds.west, bounds.south, bounds.east, bounds.north));
                    viewer.camera.flyTo({
                        destination: needed,
                        orientation: {
                            heading: Cesium.Math.toRadians(0.0),
                            pitch: Cesium.Math.toRadians(-90.0),
                            roll: 0.0
                        }
                    })
                }

                $rootScope.$on('cesium_position_clicked', function (event, lon_lat) {
                    if (last_measure_pick == null)
                        last_measure_pick = character.currentPos();
                    if ($scope.game_state == 'running') {
                        character.changeTargetPosition(lon_lat, last_time);
                    }
                    if ($scope.game_state == 'planning') {
                        addMeasurementPosition(lon_lat);
                    }
                });

                $scope.total_distance = 0;
                function addMeasurementPosition(lon_lat) {
                    var distance = Cesium.Cartesian3.distance(Cesium.Cartesian3.fromDegrees(last_measure_pick[0], last_measure_pick[1]), Cesium.Cartesian3.fromDegrees(lon_lat[0], lon_lat[1]));
                    $scope.total_distance += distance;
                    var rectangleInstance = new Cesium.GeometryInstance({
                        geometry: new Cesium.CorridorGeometry({
                            positions: Cesium.Cartesian3.fromDegreesArray([last_measure_pick[0], last_measure_pick[1], lon_lat[0], lon_lat[1]]),
                            width: 5
                        }),
                        attributes: {
                            color: new Cesium.ColorGeometryInstanceAttribute(0.9, .2, .2, 0.8)
                        }
                    });
                    var line = viewer.scene.primitives.add(new Cesium.GroundPrimitive({
                        geometryInstances: rectangleInstance
                    }));
                    line.distance = distance;
                    planning_line_segments.push(line);
                    last_measure_pick = lon_lat;
                }

                $scope.total_distance_run = 0;
                var track_points = [];
                var track_line_primitive = null;
                var track_segment_collection = [];
                function addRunPosition(lon_lat) {
                    if (last_run_position == null)
                        last_run_position = character.currentPos();
                    var caretesian_pos = Cesium.Cartesian3.fromDegrees(lon_lat[0], lon_lat[1]);
                    var distance = Cesium.Cartesian3.distance(Cesium.Cartesian3.fromDegrees(last_run_position[0], last_run_position[1]), caretesian_pos);
                    if (distance > 0) {
                        track_points.push(caretesian_pos);
                        $scope.total_distance_run += distance;
                        if (track_points.length > 1) {
                            var lineInstance = new Cesium.GeometryInstance({
                                geometry: new Cesium.CorridorGeometry({
                                    positions: track_points,
                                    width: 5
                                }),
                                attributes: {
                                    color: new Cesium.ColorGeometryInstanceAttribute(0.9, .9, .1, 0.8)
                                }
                            });
                            if (track_line_primitive != null) viewer.scene.primitives.remove(track_line_primitive);
                            track_line_primitive = new Cesium.GroundPrimitive({
                                geometryInstances: lineInstance
                            })
                            viewer.scene.primitives.add(track_line_primitive);
                            if (track_points.length >= 200) {
                                track_segment_collection.push(track_line_primitive)
                                track_line_primitive = null;
                                track_points = [caretesian_pos];
                            }
                        }
                        running_line_segments.push({ point: [lon_lat[0], lon_lat[1], lon_lat[2]], time: new Date(), distance: distance });
                    }
                    last_run_position = [lon_lat[0], lon_lat[1], lon_lat[2]];
                }

                function playGo() {
                    var audio = new Audio('sounds/go.mp3');
                    audio.play();
                }

                $rootScope.$on('map.loaded', function () {
                    map = hs_map.map;
                    if (Core.isMobile()) {
                        if (angular.isUndefined(geolocation.geolocation))
                            geolocation.gpsStatus = true;
                        else
                            geolocation.startGpsWatch();
                    }
                });

                $rootScope.$on('cesiummap.loaded', function (event, _viewer) {
                    viewer = _viewer;
                    var scene = viewer.scene;
                    scene.globe.depthTestAgainstTerrain = true;
                    disableRightMouse(scene);
                    character.currentPos([hs_map.map.getView().getCenter()[0], hs_map.map.getView().getCenter()[1], 0]);
                    character.init($scope, $compile, olus, viewer, stations);
                    olus.init($scope, $compile, map, utils, _viewer, character);
                    tick();
                });

                $rootScope.$on('map.sync_center', function (e, center, bounds) {
                    if ($scope.game_state == 'before_game' && angular.isUndefined($scope.geolocated))
                        character.currentPos(center);
                    olus.getOlus(character.currentPos());
                })

                $scope.$on('infopanel.updated', function (event) { });

                $scope.donePlanning = function () {
                    time_game_started = last_time;
                    full_date = running_start_date;
                    startRunning()
                }

                $scope.endGame = function () {
                    var el = angular.element('<div hs.enddialog></div>');
                    $("#hs-dialog-area").append(el);
                    $compile(el)($scope);
                    $scope.game_started = false;
                    var audio = new Audio('sounds/fanfare.mp3');
                    audio.play();
                }

                $scope.getGpx = function () {
                    var head = `<?xml version="1.0" encoding="UTF-8"?>
    <gpx version="1.1" creator="Rogainonline.com" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/GpxExtensions/v3 http://www.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1" xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <metadata>
        <time>${(new Date()).toISOString()}</time>
        </metadata>
        <trk>
        <src>http://www.rogainonline.com/</src>
        <link href="https://www.endomondo.com/users/1974971/workouts/1007491933">
            <text>rogainonline</text>
        </link>
        <type>ORIENTEERING</type>
        <trkseg>
                        `;
                    var trkpts = running_line_segments.reduce((accumulator, l) => `${accumulator}<trkpt lat="${l.point[1]}" lon="${l.point[0]}">
                    <ele>${l.point[2]}</ele>
                    <time>${l.time.toISOString()}</time>
                  </trkpt>`, '');
                    var end = `         </trkseg>
    </trk>
</gpx>`;

                    download('rogainonline_' + (new Date()).toISOString() + '.gpx', head + trkpts + end);
                }

                function download(filename, text) {
                    var element = document.createElement('a');
                    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
                    element.setAttribute('download', filename);

                    element.style.display = 'none';
                    document.body.appendChild(element);

                    element.click();

                    document.body.removeChild(element);
                }

                var last_good_altitude = null;
                $scope.$on('geolocation.updated', function (event, data) {
                    if (data && angular.isDefined(data.latlng)) {
                        $scope.geolocated = true;
                        var l = data.latlng;
                        if (character.currentPos()[2] > 0)
                            last_good_altitude = character.currentPos()[2]
                        var altitude_bad = data.altitude == null || angular.isUndefined(data.altitude);
                        var altitude = (data.altitude || last_good_altitude) || 0;
                        character.currentPos([l[0], l[1], altitude]);
                        stations.checkAtCoords(character.currentPos());
                        if (altitude_bad) {
                            character.calculateAltitude(last_time)
                        }

                    }
                });

                $scope.locateMe = function () {
                    if (geolocation.last_location && angular.isDefined(geolocation.last_location.latlng)) {
                        geolocation
                        $scope.geolocated = true;
                        var l = geolocation.last_location.latlng;
                        character.currentPos([l[0], l[1]]);
                    }
                }

                $scope.share = function () {
                    var tmp_resol = viewer.resolutionScale;
                    viewer.resolutionScale = 1;
                    viewer.render();
                    $.ajax({
                        type: "POST",
                        url: "sharestore.php",
                        data: {
                            img: viewer.canvas.toDataURL()
                        }
                    }).done(function (o) {
                        if (o.result == 1) {
                            shareSocial('facebook', o.file)
                        }
                    });
                    viewer.resolutionScale = tmp_resol;
                }

                function shareSocial(provider, image_file) {
                    var url = permalink_service.getPermalinkUrl() + '&image=' + image_file + '&km=' + encodeURIComponent(($scope.total_distance_run / 1000).toFixed(2));
                    $http.post('https://www.googleapis.com/urlshortener/v1/url?key=AIzaSyDn5HGT6LDjLX-K4jbcKw8Y29TRgbslfBw', {
                        longUrl: url
                    }).success(function (data, status, headers, config) {
                        $scope.share_url = data.id;
                        socialshare.share({
                            'provider': provider,
                            'attrs': {
                                'socialshareText': ($scope.total_distance_run / 1000).toFixed(2) + 'km run',
                                'socialshareSubject': ($scope.total_distance_run / 1000).toFixed(2) + 'km run',
                                'socialshareBody': ($scope.total_distance_run / 1000).toFixed(2) + 'km run',
                                'socialshareUrl': $scope.share_url,
                                'socialsharePopupHeight': 600,
                                'socialsharePopupWidth': 500
                            }
                        })
                    }).error(function (data, status, headers, config) {
                        if (console) console.log('Error creating short Url');
                    });
                }

                $scope.restart = function () {
                    $scope.game_state = 'before_game';
                    $scope.game_started = false;
                    stations.clear();
                    if (track_line_primitive != null) viewer.scene.primitives.remove(track_line_primitive);
                    angular.forEach(track_segment_collection, function (line) {
                        viewer.scene.primitives.remove(line);
                    })
                    track_points = [];
                }
            }
        ]);

        return module;
    });
