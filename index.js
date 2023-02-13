/*
 * gulp-po2json-angular-translate-qy
 * https://github.com/rocwong/gulp-po2json-angular-translate-qy
 *
 * based on grunt-po2json-angular-translate v0.0.3
 * https://github.com/angular-translate/grunt-po2json-angular-translate
 *
 * Copyright (c) 2015 rocwong
 * Licensed under the MIT license.
 */

'use strict';
var through = require('through2');
var pluginError = require('gulp-util').PluginError;
var _ = require('lodash');
var po = require('node-po');
var path = require('path');

var PLUGIN_NAME = 'gulp-po2json-angular-translate-qy';

function po2Json(options) {
  options = _.extend({
    pretty: false,
    fuzzy: false,
    upperCaseId : false,
    stringify : true,
    offset : 0,
    enableAltPlaceholders: true,
    placeholderStructure: ['{','}']
  }, options);


  var replacePlaceholder = function(string, openingMark, closingMark,altEnabled){
    if (closingMark !== undefined &&
      altEnabled &&
      string.indexOf(closingMark !== -1)){
      // if (string.indexOf(openingMark) !== -1){ // Quiply: removed, because openingMark can already be a regex
        var regOpening = new RegExp(openingMark,'g');
        string = string.replace(regOpening,'{{');
      // }
      if (string.indexOf(closingMark) !== -1){
        var regClosing = new RegExp(closingMark,'g');
        string = string.replace(regClosing,'}}');
      }
    }

    //If there is no closing mark, then we have standard format: %0,
    //if(string.indexOf(closingMark === -1)){
    //    var pattern ='\\%([0-9]|[a-z])';
    //    var re = new RegExp(pattern,'g');
    //    var index = string.indexOf(re);
    //    var substr = string.substr(index,index+2);
    //    string = string.replace(re, '{{'+substr+'}}');
    //}
    return string;
  };

	return through.obj(function(file, enc, cb) {
    if (file.isNull()) {
      this.push(file);
      return cb();
    }

    if (file.isStream()) {
      this.emit('error', new pluginError(PLUGIN_NAME, 'Streaming not supported'));
      return cb();
    }

    var singleFile = false;
    var singleFileStrings = {};
    var catalog = po.parse(file.contents.toString());
    var strings = {};


    for (var i = 0; i < catalog.items.length; i++) {
        var item = catalog.items[i];
        if (options.upperCaseId){
            item.msgid = item.msgid.toUpperCase();
        }

        if (item.msgid_plural!== null && item.msgstr.length > 1){
            var singular_words = item.msgstr[0].split(' ');
            var plural_words = item.msgstr[1].split(' ');
            var pluralizedStr = '';
            var numberPlaceHolder = false;

            if (singular_words.length !== plural_words.length){
              this.emit('error', new pluginError(PLUGIN_NAME, 'Either the singular or plural string had more words in the msgid: ' + item.msgid + ', the extra words were omitted'));
            }

            for (var x = 0; x < singular_words.length; x++){

                if(singular_words[x] === undefined || plural_words[x] === undefined){
                    continue;
                }

                if (plural_words[x].indexOf('%d') !== -1){
                    numberPlaceHolder = true;
                    continue;
                }

                if (singular_words[x] !== plural_words[x]){
                    var p = '';
                    if (numberPlaceHolder){
                        p = '# ';
                        numberPlaceHolder = false;
                    }

                    var strPl = 'PLURALIZE, plural, offset:'+options.offset;

                    pluralizedStr += '{'+ strPl + ' =1{' + p + singular_words[x]+'}' +
                        ' other{' + p + plural_words[x] +'}}';

                }else{
                    pluralizedStr += singular_words[x];
                }

                if (x !== singular_words.length - 1 ){
                    pluralizedStr += ' ';
                }
            }

            //pluralizedStr = replacePlaceholder(pluralizedStr,options.placeholderStructure[0],options.placeholderStructure[1],options.enableAltPlaceholders);
            strings[item.msgid] = pluralizedStr ;
            if (singleFile){
                singleFileStrings[item.msgid]=  pluralizedStr;
            }

        }else{
            var message = item.msgstr.length === 1 ? item.msgstr[0] : item.msgstr;
            message = replacePlaceholder(message,options.placeholderStructure[0],options.placeholderStructure[1],options.enableAltPlaceholders);
            strings[item.msgid] = message;
            if (singleFile){
                singleFileStrings[item.msgid]=message;
            }
        }
    }

    file.contents = new Buffer(JSON.stringify(strings, null, (options.pretty) ? 2: ''));

    var dirname = path.dirname(file.path);
    var basename = path.basename(file.path, '.po');
    file.path = path.join(dirname, basename + '.json');

    this.push(file);
    cb();

	});
}

module.exports = po2Json;
