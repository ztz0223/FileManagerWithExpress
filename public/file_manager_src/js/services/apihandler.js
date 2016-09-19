(function (angular, $) {
    'use strict';
    angular.module('FileManagerApp')
        .config(['$httpProvider', function ($httpProvider) {
            $httpProvider.defaults.headers.common['Content-Type'] = 'application/x-www-form-urlencoded';
            $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

            console.log('file manager config');
        }])
        .run(['localStorageService', 'fileManagerConfig', 'tokenUpdate', function (localStorageService, fileManagerConfig, tokenUpdate) {

            // Each time load the website, clear the storage
            localStorageService.remove(fileManagerConfig.tokenKeyName);

            //Launch update token job
            tokenUpdate.launchUpdate();

            console.log('file manager run');
        }])
        .service('apiHandler', ['$http', '$q', '$window', '$translate', '$interval', 'fileManagerConfig', 'Upload', 'uuid4', 'tokenUpdate',
            function ($http, $q, $window, $translate, $interval, fileManagerConfig, Upload, uuid4, tokenUpdate) {
                var ApiHandler = function () {
                    this.inprocess = false;
                    this.asyncSuccess = false;
                    this.error = '';
                };

                ApiHandler.prototype.deferredHandler = function (data, deferred, code, defaultMsg) {
                    if (!data || typeof data !== 'object') {
                        this.error = 'Error %s - Response error, please check the API docs or this ajax response.'.replace('%s', code);
                    }
                    if (code == 404) {
                        this.error = 'Error 404 - Backend server is not working, please check the ajax response.';
                    }
                    if (data.result && data.result.error) {
                        this.error = data.result.error;
                    }
                    if (!this.error && data.error) {
                        this.error = data.error.message;
                    }
                    if (!this.error && defaultMsg) {
                        this.error = defaultMsg;
                    }
                    if (this.error) {
                        return deferred.reject(data);
                    }
                    return deferred.resolve(data);
                };

                ApiHandler.prototype.buildTokenConfig = function (token) {
                    var config = {};
                    if (token) {
                        config.headers = {
                            'Authentication': token.type + ' ' + token.access_token
                        };
                    }

                    return config;
                };

                ApiHandler.prototype.list = function (apiUrl, pkgId, folderId, path, customDeferredHandler) {
                    var self = this;
                    var dfHandler = customDeferredHandler || self.deferredHandler;
                    var deferred = $q.defer();

                    self.inprocess = true;
                    self.error = '';

                    tokenUpdate.getTokenSync().then(
                        function (token) {
                            var url = apiUrl + '/' + pkgId + '/folder/' + folderId;
                            $http.get(url, self.buildTokenConfig(token)).success(function (data, code) {
                                dfHandler(data, deferred, code);
                            }).error(function (data, code) {
                                dfHandler(data, deferred, code, 'Unknown error listing, check the response');
                            })['finally'](function () {
                                self.inprocess = false;
                            });
                        },
                        function () {
                            self.inprocess = false;
                        });
                    return deferred.promise;
                };

                ApiHandler.prototype.listPkg = function (apiUrl, customDeferredHandler) {
                    var self = this;
                    var dfHandler = customDeferredHandler || self.deferredHandler;
                    var deferred = $q.defer();

                    self.inprocess = true;
                    self.error = '';

                    tokenUpdate.getTokenSync().then(
                        function (token) {
                            $http.get(apiUrl, self.buildTokenConfig(token)).success(function (data, code) {
                                // Set the type of the file as 'pkg' by force
                                data.items.forEach(function (item) {
                                    item.type = 'pkg';
                                });

                                dfHandler(data, deferred, code);
                            }).error(function (data, code) {
                                dfHandler(data, deferred, code, 'Unknown error listing, check the response');
                            })['finally'](function () {
                                self.inprocess = false;
                            });
                        },
                        function () {
                            self.inprocess = false;
                        }
                    );

                    return deferred.promise;
                };

                ApiHandler.prototype.copy = function (apiUrl, items, path, singleFilename) {
                    var self = this;
                    var deferred = $q.defer();
                    var data = {
                        action: 'copy',
                        items: items,
                        newPath: path
                    };

                    if (singleFilename && items.length === 1) {
                        data.singleFilename = singleFilename;
                    }

                    self.inprocess = true;
                    self.error = '';
                    $http.post(apiUrl, data).success(function (data, code) {
                        self.deferredHandler(data, deferred, code);
                    }).error(function (data, code) {
                        self.deferredHandler(data, deferred, code, $translate.instant('error_copying'));
                    })['finally'](function () {
                        self.inprocess = false;
                    });
                    return deferred.promise;
                };

                ApiHandler.prototype.move = function (apiUrl, items, path) {
                    var self = this;
                    var deferred = $q.defer();
                    var data = {
                        action: 'move',
                        items: items,
                        newPath: path
                    };
                    self.inprocess = true;
                    self.error = '';
                    $http.post(apiUrl, data).success(function (data, code) {
                        self.deferredHandler(data, deferred, code);
                    }).error(function (data, code) {
                        self.deferredHandler(data, deferred, code, $translate.instant('error_moving'));
                    })['finally'](function () {
                        self.inprocess = false;
                    });
                    return deferred.promise;
                };

                ApiHandler.prototype.remove = function (apiUrl, packageId, items) {
                    return this.removePkgOrFile(apiUrl, packageId, items);
                };

                ApiHandler.prototype.buildDeleteUrl = function (apiUrl, packageId, item) {
                    var url = apiUrl;
                    var type = item.model.type;

                    if (type === 'pkg') {
                        url = apiUrl + '/' + item.model.id;
                    }
                    else if (type === 'dir') {
                        url = apiUrl + '/' + packageId + '/folder/' + item.model.id;
                    }
                    else if (type === 'file') {
                        url = apiUrl + '/' + packageId + '/file/' + item.model.id;
                    }

                    return url;
                };

                ApiHandler.prototype.buildUploadUrl = function (apiUrl, packageId, parentId) {
                    var url = apiUrl;

                    // If package id same as parent id, means under package
                    if (packageId === parentId) {
                        url = apiUrl + '/' + packageId + '/file/' + uuid4.generate();
                    }
                    else {
                        url = apiUrl + '/' + packageId + '/parent/' + parentId + '/file';
                    }

                    return url;
                };

                ApiHandler.prototype.buildDownloadUrl = function (apiUrl, packageId, fileId, item) {
                    var url;

                    if (item && item.model && item.model.id) {
                        url = apiUrl + '/' + packageId + '/file/' + item.model.id;
                    }
                    else {
                        url = apiUrl + '/' + packageId + '/file/' + fileId;
                    }
                    return url;
                };

                ApiHandler.prototype.removePkgOrFile = function (apiUrl, packageId, items) {
                    var self = this;
                    var deferred = $q.defer();

                    self.inprocess = true;
                    self.error = '';

                    tokenUpdate.getTokenSync().then(
                        function (token) {
                            var config = self.buildTokenConfig(token);
                            var httpFn = function (items) {
                                var allProm = [];
                                items.forEach(function (item) {
                                    var url = self.buildDeleteUrl(apiUrl, packageId, item);
                                    allProm.push($http.delete(url, config));
                                });

                                return $q.all(allProm);
                            };

                            var data = {};
                            httpFn(items).then(
                                function (result) {
                                    data.status = result[0].status || 200;
                                    data.statusText = result[0].statusText;
                                    self.deferredHandler(data, deferred, data.status);
                                },
                                function (result) {
                                    data.status = result.status || 404;
                                    data.result.error = result.statusText;
                                    self.deferredHandler(data, deferred, data.status, $translate.instant('error_deleting'));
                                })
                                ['finally'](function () {
                                self.inprocess = false;
                            });
                        },
                        function () {
                            self.inprocess = false;
                        }
                    );

                    return deferred.promise;
                };

                ApiHandler.prototype.upload = function (apiUrl, packageId, parentId, files) {
                    var self = this;
                    var deferred = $q.defer();
                    self.inprocess = true;
                    self.progress = 0;
                    self.error = '';

                    tokenUpdate.getTokenSync().then(
                        function (token) {
                            var tokenConfig = self.buildTokenConfig(token);
                            var uploadFn = function (items) {
                                var allProm = [];
                                items.forEach(function (item) {
                                    var data = {
                                        user: "None",
                                        file: item
                                    };

                                    var url = self.buildUploadUrl(apiUrl, packageId, parentId);
                                    allProm.push(Upload.upload({
                                        url: url,
                                        config: tokenConfig,
                                        data: data
                                    }));
                                });

                                self.progress = 51; // Random number for progress
                                return $q.all(allProm);
                            };

                            if (files && files.length) {

                                // Set the timer 1s to update the progress bar
                                var timer = $interval(function () {
                                    var progress = self.progress;
                                    if (progress < 99) {
                                        progress += Math.ceil(Math.random() * 10);
                                    }
                                    self.progress = (progress > 99) ? 99 : progress;
                                }, 1000);

                                var data = {};
                                uploadFn(files).then(function (result) {
                                    data.status = result[0].status || 200;
                                    data.statusText = result[0].statusText;
                                    self.deferredHandler(data, deferred, data.status);
                                }, function (data) {
                                    data.status = result.status || 404;
                                    data.result.error = result.statusText;
                                    self.deferredHandler(data, deferred, data.status, $translate.instant('Unknown error uploading files'));
                                })['finally'](function () {
                                    self.inprocess = false;
                                    self.progress = 0;
                                    $interval.cancel(timer);
                                });
                            }
                        },
                        function () {
                            self.inprocess = false;
                            self.progress = 0;
                        }
                    );

                    return deferred.promise;
                };

                ApiHandler.prototype.getContent = function (apiUrl, itemPath) {
                    var self = this;
                    var deferred = $q.defer();
                    var data = {
                        action: 'getContent',
                        item: itemPath
                    };

                    self.inprocess = true;
                    self.error = '';
                    tokenUpdate.getTokenSync().then(
                        function (token) {
                            $http.post(apiUrl, self.buildTokenConfig(token), data).success(function (data, code) {
                                self.deferredHandler(data, deferred, code);
                            }).error(function (data, code) {
                                self.deferredHandler(data, deferred, code, $translate.instant('error_getting_content'));
                            })['finally'](function () {
                                self.inprocess = false;
                            });
                        },
                        function () {
                            self.inprocess = false;
                        }
                    );
                    return deferred.promise;
                };

                ApiHandler.prototype.edit = function (apiUrl, itemPath, content) {
                    var self = this;
                    var deferred = $q.defer();
                    var data = {
                        action: 'edit',
                        item: itemPath,
                        content: content
                    };

                    self.inprocess = true;
                    self.error = '';

                    $http.post(apiUrl, data).success(function (data, code) {
                        self.deferredHandler(data, deferred, code);
                    }).error(function (data, code) {
                        self.deferredHandler(data, deferred, code, $translate.instant('error_modifying'));
                    })['finally'](function () {
                        self.inprocess = false;
                    });
                    return deferred.promise;
                };

                ApiHandler.prototype.rename = function (apiUrl, itemPath, newPath) {
                    var self = this;
                    var deferred = $q.defer();
                    var data = {
                        action: 'rename',
                        item: itemPath,
                        newItemPath: newPath
                    };
                    self.inprocess = true;
                    self.error = '';
                    $http.post(apiUrl, data).success(function (data, code) {
                        self.deferredHandler(data, deferred, code);
                    }).error(function (data, code) {
                        self.deferredHandler(data, deferred, code, $translate.instant('error_renaming'));
                    })['finally'](function () {
                        self.inprocess = false;
                    });
                    return deferred.promise;
                };

                ApiHandler.prototype.getUrl = function (apiUrl, path) {
                    var data = {
                        action: 'download',
                        path: path
                    };
                    return path && [apiUrl, $.param(data)].join('?');
                };

                ApiHandler.prototype.download = function (apiUrl, toPackageId, toFileId, toFilename) {
                    var self = this;
                    var deferred = $q.defer();
                    self.inprocess = true;
                    var config = {
                        method: 'GET',
                        params: {
                            user: 'None'
                        }
                    };
                    /*
                     * Can not use: $http.get(config).success
                     * But can use: $http(config).success
                     * Or: $http.get(apiUrl, config).success
                     * For the root cause: $http.get is a shortcut method for $http({ method: 'GET' }), and expects the URL as the first parameter.
                     */
                    var url = self.buildDownloadUrl(apiUrl, toPackageId, toFileId);
                    $http.get(url, config).success(function (data) {
                        var bin = new $window.Blob([data]);
                        deferred.resolve(data);
                        // Using file-saver library to handle saving work.
                        saveAs(bin, toFilename);
                    }).error(function (data, code) {
                        self.deferredHandler(data, deferred, code, $translate.instant('error_downloading'));
                    })['finally'](function () {
                        self.inprocess = false;
                    });
                    return deferred.promise;
                };

                ApiHandler.prototype.handleMultipleItems = function (items, fn) {
                    var deferred = $q.defer();
                    var counter = 0;
                    var result = [];

                    items.forEach(function (item) {
                        counter++;
                        fn(item).then(function (data) {
                            result.push(data);
                            if (!(--counter)) {
                                deferred.resolve(result);
                            }
                        }, function (data, code) {
                            deferred.reject(data, code);
                        });
                    });

                    if (counter === 0) {
                        deferred.resolve(result);
                    }

                    return deferred.promise;
                };

                ApiHandler.prototype.downloadMultiple = function (apiUrl, toPackageId, items) {
                    var self = this;

                    var downloadSingle = function (item) {

                        var toFilename = item.model && item.model.name || 'DownloadFIle';
                        var deferred = $q.defer();
                        var url = self.buildDownloadUrl(apiUrl, toPackageId, null, item);

                        $http.get(url).success(function (data) {
                            var bin = new $window.Blob([data]);
                            deferred.resolve({status: '200'});
                            saveAs(bin, toFilename);
                        }).error(function (data, code) {
                            deferred.reject(data, code);
                        });

                        return deferred.promise;
                    };

                    var deferred = $q.defer();

                    self.inprocess = true;
                    self.handleMultipleItems(items, downloadSingle).then(function (result) {
                            deferred.resolve(result);
                        },
                        function (data, code) {
                            self.deferredHandler(data, deferred, code, $translate.instant('error_downloading'));
                        }
                    )['finally'](function () {
                        self.inprocess = false;
                    });

                    return deferred.promise;
                };

                ApiHandler.prototype.compress = function (apiUrl, items, compressedFilename, path) {
                    var self = this;
                    var deferred = $q.defer();
                    var data = {
                        action: 'compress',
                        items: items,
                        destination: path,
                        compressedFilename: compressedFilename
                    };

                    self.inprocess = true;
                    self.error = '';
                    $http.post(apiUrl, data).success(function (data, code) {
                        self.deferredHandler(data, deferred, code);
                    }).error(function (data, code) {
                        self.deferredHandler(data, deferred, code, $translate.instant('error_compressing'));
                    })['finally'](function () {
                        self.inprocess = false;
                    });
                    return deferred.promise;
                };

                ApiHandler.prototype.extract = function (apiUrl, item, folderName, path) {
                    var self = this;
                    var deferred = $q.defer();
                    var data = {
                        action: 'extract',
                        item: item,
                        destination: path,
                        folderName: folderName
                    };

                    self.inprocess = true;
                    self.error = '';
                    $http.post(apiUrl, data).success(function (data, code) {
                        self.deferredHandler(data, deferred, code);
                    }).error(function (data, code) {
                        self.deferredHandler(data, deferred, code, $translate.instant('error_extracting'));
                    })['finally'](function () {
                        self.inprocess = false;
                    });
                    return deferred.promise;
                };

                ApiHandler.prototype.changePermissions = function (apiUrl, items, permsOctal, permsCode, recursive) {
                    var self = this;
                    var deferred = $q.defer();
                    var data = {
                        action: 'changePermissions',
                        items: items,
                        perms: permsOctal,
                        permsCode: permsCode,
                        recursive: !!recursive
                    };

                    self.inprocess = true;
                    self.error = '';
                    $http.post(apiUrl, data).success(function (data, code) {
                        self.deferredHandler(data, deferred, code);
                    }).error(function (data, code) {
                        self.deferredHandler(data, deferred, code, $translate.instant('error_changing_perms'));
                    })['finally'](function () {
                        self.inprocess = false;
                    });
                    return deferred.promise;
                };

                ApiHandler.prototype.createFolder = function (apiUrl, path, pkgId, folderId, name) {
                    var self = this;
                    var deferred = $q.defer();
                    var data = {
                        action: 'createFolder',
                        newPath: path
                    };
                    var url = apiUrl + '/' + pkgId + '/parent/' + folderId + '/folder/' + name;

                    self.inprocess = true;
                    self.error = '';
                    $http.post(url, data).success(function (data, code) {
                        self.deferredHandler(data, deferred, code);
                    }).error(function (data, code) {
                        self.deferredHandler(data, deferred, code, $translate.instant('error_creating_folder'));
                    })['finally'](function () {
                        self.inprocess = false;
                    });

                    return deferred.promise;
                };

                ApiHandler.prototype.createBucket = function (apiUrl, name) {
                    var self = this;
                    var deferred = $q.defer();
                    var data = {
                        owner: 'None',
                        bucketKey: name,
                        id: uuid4.generate()
                    };

                    self.inprocess = true;
                    self.error = '';
                    $http.post(apiUrl, data).success(function (data, code) {
                        self.deferredHandler(data, deferred, code);
                    }).error(function (data, code) {
                        self.deferredHandler(data, deferred, code, $translate.instant('error_creating_package'));
                    })['finally'](function () {
                        self.inprocess = false;
                    });

                    return deferred.promise;
                };

                return ApiHandler;

            }]);
})(angular, jQuery);