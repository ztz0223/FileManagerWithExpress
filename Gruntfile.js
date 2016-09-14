/**
 * Created by azuo1228 on 8/31/16.
 */
module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                separator: ';'
            },
            dist: {
                src: ['public/**/*.js'],
                dest: 'dist/<%= pkg.name %>.js'
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
            },
            target: {
                files: {
                    'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
                }
            }
        },
        jshint: {
            files: ['Gruntfile.js', 'routes/*.js', './*.js', 'public/**/*.js'],
            options: {
                //这里是覆盖JSHint默认配置的选项
                globals: {
                    jQuery: true,
                    console: true,
                    module: true,
                    document: true
                }
            }
        },
        watch: {
            serverViews: {
                files: ['views/*.html'],
                options: {
                    livereload: 12345
                }
            },
            serverJS: {
                files: ['bin/www', 'app.js', 'Gruntfile.js', 'routes/**.js'],
                tasks: ['jshint'],
                options: {
                    livereload: 12345
                }
            },
            clientViews: {
                files: ['public/**/*.html'],
                options: {
                    livereload: 12345
                }
            },
            clientJS: {
                files: ['public/**/*.js'],
                tasks: ['jshint'],
                options: {
                    livereload: 12345
                }
            },
            clientCSS: {
                files: ['public/**/*.css'],
                tasks: ['csslint'],
                options: {
                    livereload: 12345
                }
            }
        },
        nodemon: {
            dev: {
                script: 'bin/www',
                options: {
                    nodeArgs: ['--debug'],
                    ext: 'js,html',
                    watch: []
                }
            }
        },
        concurrent: {
            default: ['nodemon', 'watch'],
            debug: ['nodemon', 'watch', 'node-inspector'],
            options: {
                logConcurrentOutput: true
            }
        },
        'node-inspector': {
            custom: {
                options: {
                    'web-port': 1337,
                    'web-host': 'localhost',
                    'debug-port': 5858,
                    'save-live-edit': true,
                    'no-preload': true,
                    'stack-trace-limit': 50,
                    'hidden': []
                }
            }
        },
        connect: {
            server: {
                options: {
                    debug: true,
                    port: 3001,
                    hostname: '*',
                    //keepalive: true,  //No set true, for I need watching codes
                    base: ['./', 'views/', 'public']
                }
            }
        }

    });

    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-contrib-nodemon');
    grunt.loadNpmTasks('grunt-node-inspector');

    grunt.registerTask('test', ['jshint']);

    grunt.registerTask('code', ['concat', 'uglify']);

    // Run the project in development mode
    grunt.registerTask('server', ['test', 'concat', 'uglify', 'concurrent:default']);

    // Run the project in debug mode
    grunt.registerTask('debug', ['test', 'concat', 'uglify', 'concurrent:debug']);

    grunt.registerTask('default', ['test', /*'concat', 'uglify', */'connect', 'watch']);

};