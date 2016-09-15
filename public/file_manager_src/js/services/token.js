/**
 * Created by azuo1228 on 9/15/16.
 */
(function (angular, $) {
    'use strict';

    angular.module('FileManagerApp')
        .service('tokenUpdate', ['$http', '$q', '$interval', 'localStorageService', 'fileManagerConfig',
            function ($http, $q, $interval, localStorageService, fileManagerConfig) {

                this.updateToken = function () {
                    var deferred = $q.defer();

                    $http.get(fileManagerConfig.tokenUrl)
                        .success(function (data, code) {
                            localStorageService.set(fileManagerConfig.tokenKeyName, {
                                key: data.key,
                                value: data.value,
                                valid: true
                            });
                            deferred.resolve(data);
                        })
                        .error(function (data, code) {
                            deferred.reject(data);
                        });

                    return deferred.promise;
                };

            }]);
})(angular, $);