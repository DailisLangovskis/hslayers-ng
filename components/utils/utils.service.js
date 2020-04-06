import {isFunction} from 'lodash';

export default ['config', '$http', '$window', '$document', '$timeout', function (config, $http, $window, $document, $timeout) {
  const me = this;
  /**
    * @ngdoc method
    * @name hs.utils.service#proxify
    * @public
    * @param {String} url Url to proxify
    * @param {Boolean} toEncoding Optional parameter if UTF-8 encoding shouldn´t be used for non-image Urls.
    * @returns {String} Encoded Url with path to hsproxy.cgi script
    * @description Add path to proxy cgi script (hsproxy.cgi) into Url and encode rest of Url if valid http Url is send and proxy use is allowed.
    */
  this.proxify = function (url, toEncoding) {
    toEncoding = angular.isUndefined(toEncoding) ? true : toEncoding;
    let outUrl = url;
    const windowUrlPosition = url.indexOf($window.location.origin);
    if (
      ((windowUrlPosition == -1 || windowUrlPosition > 7)
      ) || me.getPortFromUrl(url) != $window.location.port) {
      if (angular.isUndefined(config.useProxy) || config.useProxy === true) {
        outUrl = config.proxyPrefix || '/cgi-bin/hsproxy.cgi?';
        if (outUrl.indexOf('hsproxy.cgi') > -1) {
          if (toEncoding && (url.indexOf('GetMap') == -1 || url.indexOf('GetFeatureInfo') > -1)) {
            outUrl += 'toEncoding=utf-8&';
          }
          outUrl = outUrl + 'url=' + encodeURIComponent(url);
        } else {
          outUrl += url;
        }
      }
    }
    return outUrl;
  };


  /**
    * @ngdoc method
    * @name hs.utils.service#shortUrl
    * @public
    * @param {String} url Url to shorten
    * @returns {String} Shortened url
    * @description Promise which shortens url by using some url shortener.
    * By default tinyurl is used, but user provided function in config.shortenUrl can be used. Example: function(url) {
            return new Promise(function(resolve, reject){
                $http.get("http://tinyurl.com/api-create.php?url=" + url, {
                    longUrl: url
                }).then(function(response) {
                    resolve(response.data);
                }).catch(function(err) {
                    reject()
                })
            })
        }
    */
  this.shortUrl = function (url) {
    if (config.shortenUrl) {
      return config.shortenUrl(url);
    }
    return new Promise(((resolve, reject) => {
      $http.get(me.proxify('http://tinyurl.com/api-create.php?url=' + url), {
        longUrl: url
      }).then((response) => {
        resolve(response.data);
      }).catch((err) => {
        reject();
      });
    }));
  };

  /**
    * @ngdoc method
    * @name hs.utils.service#getPortFromUrl
    * @param {String} url Url for which to determine port number
    * @returns {String} Port number
    */
  this.getPortFromUrl = function(url) {
    const link = $document[0].createElement('a');
    link.setAttribute('href', url);
    return link.port;
  };

  /**
    * @ngdoc method
    * @name hs.utils.service#getParamsFromUrl
    * @public
    * @param {String} str Url to parse for parameters
    * @returns {Object} Object with parsed parameters as properties
    * @description Parse parameters and their values from Url string
    */
  this.getParamsFromUrl = function (str) {
    if (!angular.isString(str)) {
      return {};
    }

    if (str.indexOf('?') > -1) {
      str = str.substring(str.indexOf('?') + 1);
    } else {
      return {};
    }

    return str.trim().split('&').reduce((ret, param) => {
      if (param == false) {
        return {};
      }
      const parts = param.replace(/\+/g, ' ').split('=');
      let key = parts[0];
      let val = parts[1];
      key = decodeURIComponent(key);
      // missing `=` should be `null`:
      // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
      val = angular.isUndefined(val) ? null : decodeURIComponent(val);

      if (!ret.hasOwnProperty(key)) {
        ret[key] = val;
      } else if (angular.isArray(ret[key])) {
        ret[key].push(val);
      } else {
        ret[key] = [ret[key], val];
      }
      return ret;
    }, {});
  };
  /**
    * @ngdoc method
    * @name hs.utils.service#paramsToUrl
    * @public
    * @param {Object} array Parameter object with parameter key-value pairs
    * @returns {String} Joined encoded Url query string
    * @description Create encoded Url string from object with parameters
    */
  this.paramsToURL = function (array) {
    const pairs = [];
    for (const key in array) {
      if (array.hasOwnProperty(key) && angular.isDefined(array[key])) {
        pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(array[key]));
      }
    }
    return pairs.join('&');
  };
  /**
    * @ngdoc method
    * @name hs.utils.service#insertAfter
    * @public
    * @param {element} newNode Element to insert
    * @param {element} referenceNode Element after which to insert
    * @description Insert every element in the set of matched elements after the target.
    */
  this.insertAfter = function (newNode, referenceNode) {
    if (angular.isDefined(newNode.length) && newNode.length > 0) {
      newNode = newNode[0];
    }
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
  };
  /**
    * @ngdoc method
    * @name hs.utils.service#paramsToUrlWoEncode
    * @public
    * @param {Object} array Parameter object with parameter key-value pairs
    * @returns {String} Joined Url query string
    * @description Create Url string from object with parameters without encoding
    */
  this.paramsToURLWoEncode = function (array) {
    const pairs = [];
    for (const key in array) {
      if (array.hasOwnProperty(key)) {
        pairs.push(key + '=' + array[key]);
      }
    }
    return pairs.join('&');
  };
  /**
   * @ngdoc method
   * @name hs.utils.service#debounce
   * @public
   * @param {Function} func Function to execute with throttling
   * @param {Number} wait  The function will be called after it stops
   * being called for N milliseconds.
   * @param {Boolean} immediate If `immediate` is passed, trigger the
   * function on the leading edge, instead of the trailing.
   * @param {Object} context Context element which stores the timeout handle
   * @return {Function} Returns function which is debounced
   * @description Returns a function, that, as long as it continues to be
   * invoked, will not be triggered.
   * (https://davidwalsh.name/javascript-debounce-function)
   */
  this.debounce = function (func, wait, immediate, context) {
    if (angular.isUndefined(context)) {
      context = this;
    }
    return function () {
      const args = arguments;
      const later = function () {
        if (!immediate) {
          func.apply(context, args);
        }
        context.timeout = null;
      };
      const callNow = immediate && !context.timeout;
      clearTimeout(context.timeout);
      // eslint-disable-next-line angular/timeout-service
      context.timeout = setTimeout(later, wait);
      if (callNow) {
        func.apply(context, args);
      }
    };
  };
  /**
    * @ngdoc method
    * @name hs.utils.service#generateUuid
    * @public
    * @returns {String} Random uuid
    * @description Generate randomized uuid
    */
  this.generateUuid = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0,
          v = c == 'x' ? r : r & 0x3 | 0x8;
      return v.toString(16);
    });
  };

  /**
    * @ngdoc method
    * @name hs.utils.service#rainbow
    * @public
    * @param {Number} numOfSteps Maximum value which is the last color in rainbow
    * @param {Number} step Current value to get color for
    * @param {Number} opacity Opacity from 0 to 1
    * @returns {String} CSS color
    * @description Generates css color string (rgba(0, 0, 0, 1)) from given range and value for which to have color
    */
  this.rainbow = function (numOfSteps, step, opacity) {
    // based on http://stackoverflow.com/a/7419630
    // This function generates vibrant, "evenly spaced" colours (i.e. no clustering). This is ideal for creating easily distiguishable vibrant markers in Google Maps and other apps.
    // Adam Cole, 2011-Sept-14
    // HSV to RBG adapted from: http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
    let r, g, b;
    const h = step / (numOfSteps * 1.00000001);
    const i = ~~(h * 4);
    const f = h * 4 - i;
    const q = 1 - f;
    switch (i % 4) {
      case 2:
        r = f, g = 1, b = 0;
        break;
      case 0:
        r = 0, g = f, b = 1;
        break;
      case 3:
        r = 1, g = q, b = 0;
        break;
      case 1:
        r = 0, g = 1, b = q;
        break;
      default:
    }
    const c = 'rgba(' + ~~(r * 235) + ',' + ~~(g * 235) + ',' + ~~(b * 235) + ', ' + opacity + ')';
    return (c);
  };

  //Check if object is an instance of a class
  this.instOf = function (obj, type) {
    const instanceOf = function (obj, klass) {
      if (isFunction(klass)) {
        return obj instanceof klass;
      }
      obj = Object.getPrototypeOf(obj);
      while (obj !== null) {
        if (obj.constructor.name === klass) {
          return true;
        }
        obj = Object.getPrototypeOf(obj);
      }
      return false;
    };
    return instanceOf(obj, type);
  };
  this.removeDuplicates = function (myArr, prop) {
    return myArr.filter((obj, pos, arr) => {
      return arr.map(mapObj => mapObj[prop]).indexOf(obj[prop]) === pos;
    });
  };

  Date.isLeapYear = function (year) {
    return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0));
  };

  Date.getDaysInMonth = function (year, month) {
    return [31, (Date.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
  };

  Date.prototype.isLeapYear = function () {
    return Date.isLeapYear(this.getFullYear());
  };

  Date.prototype.getDaysInMonth = function () {
    return Date.getDaysInMonth(this.getFullYear(), this.getMonth());
  };

  Date.prototype.addMonths = function (value) {
    const n = this.getDate();
    this.setDate(1);
    this.setMonth(this.getMonth() + value);
    this.setDate(Math.min(n, this.getDaysInMonth()));
    return this;
  };

  Date.prototype.monthDiff = function (d2) {
    let months;
    months = (d2.getFullYear() - this.getFullYear()) * 12;
    months -= this.getMonth() + 1;
    months += d2.getMonth();
    return months <= 0 ? 0 : months;
  };

  String.prototype.hashCode = function () {
    let hash = 0;
    if (this.length == 0) {
      return hash;
    }
    for (let i = 0; i < this.length; i++) {
      const char = this.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  };

  String.prototype.replaceAll = function (search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
  };


  if (!String.prototype.format) {
    String.prototype.format = function () {
      const args = arguments;
      return this.replace(/{(\d+)}/g, (match, number) => {
        return angular.isDefined(args[number]) ?
          args[number] :
          match;
      });
    };
  }

  if (!String.prototype.capitalizeFirstLetter) {
    String.prototype.capitalizeFirstLetter = function () {
      return this.charAt(0).toUpperCase() + this.slice(1);
    };
  }
}];
