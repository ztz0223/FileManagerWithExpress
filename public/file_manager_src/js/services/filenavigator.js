(function (angular) {
    'use strict';
    angular.module('FileManagerApp').service('fileNavigator', [
        '$q', 'apiMiddleware', 'fileManagerConfig', 'item', function ($q, ApiMiddleware, fileManagerConfig, Item) {

            var FileNavigator = function () {
                this.apiMiddleware = new ApiMiddleware();
                this.requesting = false;
                this.fileList = [];
                this.currentPath = [];  // ['home', 'user', 'bin'], and full path is /home/user/bin
                this.folderId = '';
                this.history = [];
                this.error = '';
                this.packageName = '';
                this.packageId = '';    // if under package path, the packageId is same as currentPathId

                this.onRefresh = function () {
                };
            };

            FileNavigator.prototype.deferredHandler = function (data, deferred, code, defaultMsg) {
                if (!data || typeof data !== 'object') {
                    this.error = 'Error %s - Bridge response error, please check the API docs or this ajax response.'.replace('%s', code);
                }
                if (code == 404) {
                    this.error = 'Error 404 - Backend bridge is not working, please check the ajax response.';
                }
                if (!this.error && data.result && data.result.error) {
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

            FileNavigator.prototype.listFolderOrPkg = function (curPath) {

                var self = this;

                // If path is not the root, list dir, or list packages under root
                if (curPath.length) {
                    var pkgId = self.packageId;
                    var folderId = self.folderId;

                    return self.list(pkgId, folderId);
                }
                else {
                    return self.listPkg();
                }
            };

            FileNavigator.prototype.list = function (pkgId, folderId) {
                return this.apiMiddleware.list(this.currentPath, pkgId, folderId, this.deferredHandler.bind(this));
            };

            FileNavigator.prototype.listPkg = function () {
                return this.apiMiddleware.listPkg(this.currentPath, this.deferredHandler.bind(this));
            };

            FileNavigator.prototype.refresh = function () {

                var a;
                var self = this;
                if (!self.currentPath.length) {
                    self.currentPath = fileManagerConfig.basePath || [];
                }
                var path = self.currentPath.join('/');
                self.requesting = true;
                self.fileList = [];
                return self.listFolderOrPkg(self.currentPath).then(function (data) {
                    self.fileList = (data.result || data.items || data.entryList || []).map(function (file) {
                        return new Item(file, self.currentPath);
                    });
                    self.buildTree(path);
                    self.onRefresh();
                }).finally(function () {
                    self.requesting = false;
                });
            };

            FileNavigator.prototype.buildTree = function (path) {
                var flatNodes = [], selectedNode = {};

                function recursive(parent, item, path) {
                    var absName = path ? (path + '/' + item.model.name) : item.model.name;
                    if (parent.name.trim() && path.trim().indexOf(parent.name) !== 0) {
                        parent.nodes = [];
                    }
                    if (parent.name !== path) {
                        parent.nodes.forEach(function (nd) {
                            recursive(nd, item, path);
                        });
                    } else {
                        for (var e in parent.nodes) {
                            if (parent.nodes[e].name === absName) {
                                return;
                            }
                        }
                        parent.nodes.push({item: item, name: absName, nodes: []});
                    }

                    parent.nodes = parent.nodes.sort(function (a, b) {
                        return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() === b.name.toLowerCase() ? 0 : 1;
                    });
                }

                function flatten(node, array) {
                    array.push(node);
                    for (var n in node.nodes) {
                        flatten(node.nodes[n], array);
                    }
                }

                function findNode(data, path) {
                    return data.filter(function (n) {
                        return n.name === path;
                    })[0];
                }

                //!this.history.length && this.history.push({name: '', nodes: []});
                if (!this.history.length) {
                    this.history.push({
                        name: fileManagerConfig.basePath ? fileManagerConfig.basePath[0] : '',
                        nodes: []
                    });
                }
                flatten(this.history[0], flatNodes);
                selectedNode = findNode(flatNodes, path);
                if (selectedNode) {
                    selectedNode.nodes = [];
                }

                for (var o in this.fileList) {
                    var item = this.fileList[o];
                    if (item instanceof Item && (item.isFolder() || item.isPackage())) {
                        recursive(this.history[0], item, path);
                    }
                }
            };

            FileNavigator.prototype.folderClick = function (item) {
                this.currentPath = [];
                if (item && (item.isFolder())) {

                    // Take package and folder as file, and package is treated as folder also.
                    if(item.isPackage()) {
                        this.packageName = item.model.name;
                        this.packageId = item.model.id;
                    }

                    this.folderId = item.model.id;
                    this.currentPath = item.model.fullPath().split('/').splice(1);
                }
                this.refresh();
            };

            FileNavigator.prototype.upDir = function () {
                if (this.currentPath[0]) {
                    this.currentPath = this.currentPath.slice(0, -1);
                    this.refresh();
                }
            };

            FileNavigator.prototype.goTo = function (index) {
                this.currentPath = this.currentPath.slice(0, index + 1);
                this.refresh();
            };

            FileNavigator.prototype.fileNameExists = function (fileName) {
                return this.fileList.find(function (item) {
                    return fileName.trim && item.model.name.trim() === fileName.trim();
                });
            };

            FileNavigator.prototype.listHasFolders = function () {
                return this.fileList.find(function (item) {
                    return item.model.type === 'dir';
                });
            };

            return FileNavigator;
        }]);
})(angular);