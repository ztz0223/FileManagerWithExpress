/**
 * Created by azuo1228 on 8/31/16.
 */


var ApplicationConfiguration = (function () {
    // Init module configuration options
    var applicationModuleName = 'FileManagerApp';
    var applicationModuleVendorDependencies = ['pascalprecht.translate', 'ngFileUpload', 'uuid4', 'LocalStorageModule'];

    // Add a new vertical module
    var registerModule = function (moduleName, dependencies) {
        // Create angular module
        angular.module(moduleName, dependencies || []);

        // Add the module to the AngularJS configuration file
        angular.module(applicationModuleName).requires.push(moduleName);
    };

    return {
        applicationModuleName: applicationModuleName,
        applicationModuleVendorDependencies: applicationModuleVendorDependencies,
        registerModule: registerModule
    };
})();


angular.module(ApplicationConfiguration.applicationModuleName, ApplicationConfiguration.applicationModuleVendorDependencies);

angular.element(document).ready(function () {
    angular.bootstrap(document, [ApplicationConfiguration.applicationModuleName]);
});

// For new module reg entry:
/*
 ApplicationConfiguration.registerModule('newApp1', []);
 ApplicationConfiguration.registerModule('newApp2', []);
 */
