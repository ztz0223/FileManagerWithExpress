/**
 * Created by azuo1228 on 9/24/16.
 */
(function (angular, $, _) {
    'use strict';
    angular.module('FileManagerApp')
    // No need to set the common header here, for apihandler will set them, and http service is singleton for one app
    // .config(['$httpProvider', function ($httpProvider) {
    //     $httpProvider.defaults.headers.common['Content-Type'] = 'application/x-www-form-urlencoded';
    //     $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
    //
    //     console.log('file manager config');
    // }])
        .service('convertHandler', ['$http', '$interval', 'fileManagerConfig', 'tokenUpdate',
            function ($http, $interval, fileManagerConfig, tokenUpdate) {

                this.buildConvertUrl = function (apiUrl, packageId, fileId) {
                    var url = apiUrl + '/projects/' + packageId + '/file/' + fileId;
                    return url;
                };

                this.updataConvertStatus = function (fileList) {

                    console.log('fileList length is:' + fileList.length);
                    var self = this;
                    tokenUpdate.getTokenSync().then(
                        function (token) {

                            var tokenConfig = tokenUpdate.buildTokenConfig(token);
                            fileList.forEach(function (file) {

                                // Just update the not finished items
                                if(file.convertOver) {
                                    return;
                                }

                                var apiUrl = self.buildConvertUrl(fileManagerConfig.convertStatusUrl, file.projectId, file.id);

                                $http.get(apiUrl, tokenConfig).success(function (data, code) {
                                    console.log("Get convert status OK");
                                    if (data && data.status && data.status === 'Finished') {
                                        file.convertOver = true;
                                    }
                                }).error(function (data, code) {
                                    console.log("Connect to convert server failed");
                                });
                            });
                        },
                        function () {
                            console.log("Get token failed");
                        }
                    );
                };

                this.launchUpdateConvertStatusTimer = function (fileList) {
                    var self = this;
                    $interval(function () {

                        if(fileList && fileList.length > 0) {
                            self.updataConvertStatus(fileList);
                        }

                        console.log('Update convert status timer!');
                    }, fileManagerConfig.convertPollInterval);
                };
            }]
        );
})(angular, jQuery, _);