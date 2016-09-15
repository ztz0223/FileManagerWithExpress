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

                this.getToken = function () {

                    var token = localStorageService.get(fileManagerConfig.tokenKeyName);
                    if (token === null) {
                        console.log('Token is null');
                    }

                    return token;
                };

                this.getTokenSync = function () {

                    var self = this;
                    var deferred = $q.defer();

                    // Get token, if null will trigger the updating token opr
                    var token = localStorageService.get(fileManagerConfig.tokenKeyName);
                    if (token !== null) {
                        deferred.resolve(token);
                    }
                    else {
                        self.updateToken().then(function (data) {
                                token = localStorageService.get(fileManagerConfig.tokenKeyName);
                                deferred.resolve(token);
                            },
                            function (data) {
                                deferred.reject(data);
                            }
                        );
                    }

                    return deferred.promise;
                };

                this.launchUpdate = function () {
                    var self = this;
                    $interval(function () {
                        console.log('Update token timer!');
                        self.updateToken();
                    }, fileManagerConfig.tokenUpdateInterval);
                };

            }]);
})(angular, $);