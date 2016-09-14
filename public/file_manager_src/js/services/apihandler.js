(function (angular, $) {
    'use strict';
    angular.module('FileManagerApp')
        .config(['$httpProvider', function ($httpProvider) {
            $httpProvider.defaults.headers.common['Content-Type'] = 'application/x-www-form-urlencoded';
            $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
        }])
        .service('apiHandler', ['$http', '$q', '$window', '$translate', 'Upload', 'uuid4',
            function ($http, $q, $window, $translate, Upload, uuid4) {
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

                ApiHandler.prototype.list = function (apiUrl, pkgId, folderId, path, customDeferredHandler) {
                    var self = this;
                    var dfHandler = customDeferredHandler || self.deferredHandler;
                    var deferred = $q.defer();

                    self.inprocess = true;
                    self.error = '';

                    var url = apiUrl + '/' + pkgId + '/folder/' + folderId;
                    $http.get(url).success(function (data, code) {
                        dfHandler(data, deferred, code);
                    }).error(function (data, code) {
                        dfHandler(data, deferred, code, 'Unknown error listing, check the response');
                    })['finally'](function () {
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

                    $http.get(apiUrl).success(function (data, code) {
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

                ApiHandler.prototype.remove = function (apiUrl, items) {
                    var self = this;
                    if(items[0].model.type === 'pkg') {
                        return self.removePkg(apiUrl, items);
                    }
                    else {
                        return self.removeFile(apiUrl, items);
                    }
                };

                ApiHandler.prototype.removePkg = function (apiUrl, items) {
                    var self = this;
                    var deferred = $q.defer();

                    self.inprocess = true;
                    self.error = '';

                    var httpFn = function (items) {
                        var allProm = [];
                        items.forEach(function (item) {
                            var url = apiUrl + '/' + item.model.id;
                            allProm.push($http.delete(url));
                        });

                        return $q.all(allProm);
                    };

                    var data = {};
                    httpFn(items)
                        .then(function (result) {
                                data.status = result[0].status || 200;
                                data.statusText = result[0].statusText;
                                self.deferredHandler(data, deferred, data.status);
                            },
                            function (result) {
                                data.status = result[0].status || 404;
                                data.result.error = result[0].statusText;
                                self.deferredHandler(data, deferred, data.status, $translate.instant('error_deleting'));
                            })
                        ['finally'](function () {
                        self.inprocess = false;
                    });

                    return deferred.promise;
                };

                // remove file or dir
                ApiHandler.prototype.removeFile = function (apiUrl, items) {
                    var self = this;
                    var deferred = $q.defer();

                    self.inprocess = true;
                    self.error = '';
                    $http.post(apiUrl, data).success(function (data, code) {
                        self.deferredHandler(data, deferred, code);
                    }).error(function (data, code) {
                        self.deferredHandler(data, deferred, code, $translate.instant('error_deleting'));
                    })['finally'](function () {
                        self.inprocess = false;
                    });
                    return deferred.promise;
                };

                ApiHandler.prototype.upload = function (apiUrl, destination, files) {
                    var self = this;
                    var deferred = $q.defer();
                    self.inprocess = true;
                    self.progress = 0;
                    self.error = '';

                    var data = {
                        destination: destination,
                        user: "None"
                    };

                    for (var i = 0; i < files.length; i++) {
                        data['file-' + i] = files[i];
                    }

                    if (files && files.length) {
                        Upload.upload({
                            url: apiUrl,
                            data: data
                        }).then(function (data) {
                            self.deferredHandler(data.data, deferred, data.status);
                        }, function (data) {
                            self.deferredHandler(data.data, deferred, data.status, 'Unknown error uploading files');
                        }, function (evt) {
                            self.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total)) - 1;
                        })['finally'](function () {
                            self.inprocess = false;
                            self.progress = 0;
                        });
                    }

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
                    $http.post(apiUrl, data).success(function (data, code) {
                        self.deferredHandler(data, deferred, code);
                    }).error(function (data, code) {
                        self.deferredHandler(data, deferred, code, $translate.instant('error_getting_content'));
                    })['finally'](function () {
                        self.inprocess = false;
                    });
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

                ApiHandler.prototype.download = function (apiUrl, itemPath, toFilename, downloadByAjax, forceNewWindow) {
                    var self = this;
                    if (!downloadByAjax || forceNewWindow) {
                        $window.console.log('Your browser dont support ajax download, downloading by default');
                        return !!$window.open(url, '_blank', '');
                    }

                    var deferred = $q.defer();
                    self.inprocess = true;
                    var config = {
                        url: apiUrl,
                        method: 'GET',
                        params: {
                            user: 'None',
                            fullPath: itemPath
                        }
                    };
                    /*
                     * Can not use: $http.get(config).success
                     * But can use: $http(config).success
                     * Or: $http.get(apiUrl, config).success
                     * For the root cause: $http.get is a shortcut method for $http({ method: 'GET' }), and expects the URL as the first parameter.
                     */
                    $http.get(apiUrl, config).success(function (data) {
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

                ApiHandler.prototype.downloadMultiple = function (apiUrl, items, toFilename, downloadByAjax, forceNewWindow) {
                    var self = this;
                    var deferred = $q.defer();
                    var data = {
                        action: 'downloadMultiple',
                        items: items,
                        toFilename: toFilename
                    };
                    var url = [apiUrl, $.param(data)].join('?');

                    if (!downloadByAjax || forceNewWindow) {
                        $window.console.log('Your browser dont support ajax download, downloading by default');
                        return !!$window.open(url, '_blank', '');
                    }

                    self.inprocess = true;
                    $http.get(apiUrl).success(function (data) {
                        var bin = new $window.Blob([data]);
                        deferred.resolve(data);
                        saveAs(bin, toFilename);
                    }).error(function (data, code) {
                        self.deferredHandler(data, deferred, code, $translate.instant('error_downloading'));
                    })['finally'](function () {
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