import '../compositions/compositions.module';
import '../language/language.module';
import permalinkComponent from './permalink.component';
import permalinkShareService from './permalink-share.service';
import permalinkUrlService from './permalink-url.service';

/**
 * @namespace hs.permalink
 * @memberOf hs
 */

angular
  .module('hs.permalink', [
    '720kb.socialshare',
    'hs.core',
    'hs.map',
    'hs.save-map',
    'hs.compositions',
    'hs.language',
  ])

  .config([
    '$locationProvider',
    function ($locationProvider) {
      $locationProvider.html5Mode({
        enabled: true,
        requireBase: false,
      });
    },
  ])

  /**
   * @ngdoc service
   * @name HsPermalinkUrlService
   * @membeof hs.permalink
   * @description Service responsible for creating permalink URLs. Mantain parameters information about map
   */
  .factory('HsPermalinkUrlService', permalinkUrlService)

  /**
   * @ngdoc service
   * @name HsPermalinkShareService
   * @membeof hs.permalink
   * @description Service responsible for sharing background. Mantain correct sharing links on the fly
   */
  .factory('HsPermalinkShareService', permalinkShareService)

  /**
   * @name hs.permalink
   * @membeof hs.permalink
   * @description
   */
  .component('hs.permalink', permalinkComponent);
