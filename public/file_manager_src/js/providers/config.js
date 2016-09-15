(function (angular) {
    'use strict';
    angular.module('FileManagerApp').provider('fileManagerConfig', function () {

        // This is for cross site url, modify this value if needed
        var xSite = 'http://127.0.0.1:3000/api/file/';

        var values = {
            appName: 'angular-filemanager v1.5',
            defaultLang: 'zh',

            listUrl: xSite + 'list',
            uploadUrl: xSite + 'upload',
            renameUrl: xSite + 'rename',
            copyUrl: xSite + 'copy',
            moveUrl: xSite + 'move',
            removeUrl: xSite + 'projects',
            editUrl: xSite + 'edit',
            getContentUrl: xSite + 'getContent',
            createFolderUrl: xSite + 'createFolder',
            downloadFileUrl: xSite + 'download',
            downloadMultipleUrl: xSite + 'downloadMulti',
            compressUrl: xSite + 'compress',
            extractUrl: xSite + 'extract',
            permissionsUrl: xSite + 'permission',
            projectUrl: xSite + 'projects',
            tokenUrl: xSite + 'token',

            tokenKeyName: 'FileManagerToken',
            tokenUpdateInterval: 30000,

            searchForm: true,
            sidebar: true,
            breadcrumb: true,

            basePathId: '@rootId',

            // All of the items should be true, I set part of them as false, to disable them in the context menu
            allowedActions: {
                upload: true,
                rename: false,
                move: false,
                copy: false,
                edit: false,
                changePermissions: false,
                compress: false,
                compressChooseName: false,
                extract: false,
                download: true,
                downloadMultiple: false,
                preview: false,
                remove: true,
                createFolder: true,
                createPackage: true,

                //By default they are false
                pickFiles: false,
                pickFolders: false
            },

            multipleDownloadFileName: 'angular-filemanager.zip',
            showExtensionIcons: true,
            showSizeForDirectories: false,
            useBinarySizePrefixes: false,
            downloadFilesByAjax: true,
            previewImagesInModal: true,
            enablePermissionsRecursive: true,
            compressAsync: false,
            extractAsync: false,
            pickCallback: null,

            isEditableFilePattern: /\.(txt|diff?|patch|svg|asc|cnf|cfg|conf|html?|.html|cfm|cgi|aspx?|ini|pl|py|md|css|cs|js|jsp|log|htaccess|htpasswd|gitignore|gitattributes|env|json|atom|eml|rss|markdown|sql|xml|xslt?|sh|rb|as|bat|cmd|cob|for|ftn|frm|frx|inc|lisp|scm|coffee|php[3-6]?|java|c|cbl|go|h|scala|vb|tmpl|lock|go|yml|yaml|tsv|lst)$/i,
            isImageFilePattern: /\.(jpe?g|gif|bmp|png|svg|tiff?)$/i,
            isExtractableFilePattern: /\.(gz|tar|rar|g?zip)$/i,
            tplPath: 'file_manager_src/templates'
        };

        return {
            $get: function () {
                return values;
            },
            set: function (constants) {
                angular.extend(values, constants);
            }
        };

    });
})(angular);
