export default ['$http', '$rootScope', function ($http, $rootScope) {
  const me = this;
  angular.extend(me, {
    getCurrentUser(endpoint) {
      const url = `${endpoint.url}/rest/current-user`;
      return new Promise((resolve, reject) => {
        $http.get(url)
          .then(
            (res) => {
              if (res.data.username && endpoint.user != res.data.username) {
                endpoint.user = res.data.username;
                $rootScope.$broadcast ('datasource-selector.layman_auth', endpoint);
              }
              resolve();
            },
            (e) => {
              reject(e);
            });
      });
    }
  });
  return me;
}];
