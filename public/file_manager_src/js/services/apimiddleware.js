(function (angular) {
    'use strict';
    angular.module('FileManagerApp').service('apiMiddleware', ['$window', 'fileManagerConfig', 'apiHandler',
        function ($window, fileManagerConfig, ApiHandler) {

            var ApiMiddleware = function () {
                this.apiHandler = new ApiHandler();
            };

            ApiMiddleware.prototype.getPath = function (arrayPath) {
                return '/' + arrayPath.join('/');
            };

            ApiMiddleware.prototype.getFileList = function (files) {
                return (files || []).map(function (file) {
                    return file && file.model.fullPath();
                });
            };

            ApiMiddleware.prototype.getFilePath = function (item) {
                return item && item.model.fullPath();
            };

            ApiMiddleware.prototype.list = function (path, pkgId, folderId, customDeferredHandler) {
                return this.apiHandler.list(fileManagerConfig.projectUrl, pkgId, folderId, this.getPath(path), customDeferredHandler);
            };

            ApiMiddleware.prototype.listPkg = function (path, customDeferredHandler) {
                return this.apiHandler.listPkg(fileManagerConfig.projectUrl, customDeferredHandler);
            };

            ApiMiddleware.prototype.copy = function (files, path) {
                var items = this.getFileList(files);
                var singleFilename = items.length === 1 ? files[0].tempModel.name : undefined;
                return this.apiHandler.copy(fileManagerConfig.copyUrl, items, this.getPath(path), singleFilename);
            };

            ApiMiddleware.prototype.move = function (files, path) {
                var items = this.getFileList(files);
                return this.apiHandler.move(fileManagerConfig.moveUrl, items, this.getPath(path));
            };

            ApiMiddleware.prototype.remove = function (packageId, files) {
                return this.apiHandler.remove(fileManagerConfig.removeUrl, packageId, files);
            };

            ApiMiddleware.prototype.upload = function (files, packageId, folderId) {
                if (!$window.FormData) {
                    throw new Error('Unsupported browser version');
                }

                return this.apiHandler.upload(fileManagerConfig.uploadUrl, packageId, folderId, files);
            };

            ApiMiddleware.prototype.getContent = function (item) {
                var itemPath = this.getFilePath(item);
                return this.apiHandler.getContent(fileManagerConfig.getContentUrl, itemPath);
            };

            ApiMiddleware.prototype.edit = function (item) {
                var itemPath = this.getFilePath(item);
                return this.apiHandler.edit(fileManagerConfig.editUrl, itemPath, item.tempModel.content);
            };

            ApiMiddleware.prototype.rename = function (item) {
                var itemPath = this.getFilePath(item);
                var newPath = item.tempModel.fullPath();

                return this.apiHandler.rename(fileManagerConfig.renameUrl, itemPath, newPath);
            };

            ApiMiddleware.prototype.getUrl = function (item) {
                var itemPath = this.getFilePath(item);
                return this.apiHandler.getUrl(fileManagerConfig.downloadFileUrl, itemPath);
            };

            ApiMiddleware.prototype.download = function (item, toPackageId, forceNewWindow) {
                //TODO: add spinner to indicate file is downloading
                var toFileId = item.model.id;
                var toFilename = item.model.name;

                if (item.isFolder()) {
                    return;
                }

                return this.apiHandler.download(
                    fileManagerConfig.downloadFileUrl,
                    toPackageId,
                    toFileId,
                    toFilename,
                    fileManagerConfig.downloadFilesByAjax,
                    forceNewWindow
                );
            };

            ApiMiddleware.prototype.downloadMultiple = function (files, toPackageId, forceNewWindow) {
                return this.apiHandler.downloadMultiple(
                    fileManagerConfig.downloadMultipleUrl,
                    toPackageId,
                    files,
                    fileManagerConfig.downloadFilesByAjax,
                    forceNewWindow
                );
            };

            ApiMiddleware.prototype.compress = function (files, compressedFilename, path) {
                var items = this.getFileList(files);
                return this.apiHandler.compress(fileManagerConfig.compressUrl, items, compressedFilename, this.getPath(path));
            };

            ApiMiddleware.prototype.extract = function (item, folderName, path) {
                var itemPath = this.getFilePath(item);
                return this.apiHandler.extract(fileManagerConfig.extractUrl, itemPath, folderName, this.getPath(path));
            };

            ApiMiddleware.prototype.changePermissions = function (files, dataItem) {
                var items = this.getFileList(files);
                var code = dataItem.tempModel.perms.toCode();
                var octal = dataItem.tempModel.perms.toOctal();
                var recursive = !!dataItem.tempModel.recursive;

                return this.apiHandler.changePermissions(fileManagerConfig.permissionsUrl, items, code, octal, recursive);
            };

            ApiMiddleware.prototype.createFolder = function (item, pkgId, folderId, name) {
                var path = item.tempModel.fullPath();
                return this.apiHandler.createFolder(fileManagerConfig.projectUrl, path, pkgId, folderId, name);
            };

            ApiMiddleware.prototype.createBucket = function (item) {
                var name = item.tempModel.name;
                return this.apiHandler.createBucket(fileManagerConfig.projectUrl, name);
            };

            return ApiMiddleware;

        }]);
})(angular);