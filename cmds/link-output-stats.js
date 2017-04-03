'use strict';

const _             = require('lodash');
const async         = require('async');
const colors        = require('colors');
const cheerio       = require('cheerio');
const fs            = require('fs');
const JSONStream    = require('JSONStream');
const request       = require('request');
const url           = require('url');
const XLSX          = require('xlsx');

const CTLinkSearchDef       = require('../lib/ctlink-search-def');
const SavedSearchDef        = require('../lib/saved-search-def');
const NciPdqMap             = require('../lib/NciPdqMap');

module.exports = LinkOutputStats;

const PATTERNS = [
  'Diag', 'TrialType', 'ClinCtr', 'IsNew', 'Intr', 'Drug', 'Phase'
];

class LinkOutputProcessor {
  constructor(nciPDQMapper, options) {
    this.nciPDQMapper = nciPDQMapper;
    this.inputFile = options.inputFile;
  }

  


  _countPatterns(links, done) {

    let patterns = { };


    links.forEach((link) => {

      let patternVal = link.search_def.getSearchPattern();
      let patternCol = '';

      if (patternVal != 'MANUAL' && patternVal != 'MISSINGMAPPING') {
        for (let i=0; i< PATTERNS.length; i++) {        
          //If this is one of the patterns, then add it to the string.
          if (patternVal & Math.pow(2, i)) {
            if (patternCol != '') { patternCol += '_' }

            patternCol += PATTERNS[i];
          }
        }
      } else { patternCol = patternVal }

      if (!patterns[patternCol]) {
        patterns[patternCol] = 0;
      }
      patterns[patternCol]++;
    });

    console.log(patterns);

    done();
  }

  _countCTLinks(links, done) {

    let cols = [
      'trial_type', 'diagnosis', 'id_type', 'cdr_id',
      'phase', 'location_clinical_center', 'location_country', 'new_trials',
      'closed'
    ];

    let counts = {
      patterns: {},
      id_types: {}
    };

    cols.forEach((col) => {
      counts[col] = 0;
    })


    links.forEach((link) => {
      cols.forEach((col) => {
        if (col == 'id_type' && link.search_def[col]) {
          if (!counts.id_types[link.search_def[col]]) {
            counts.id_types[link.search_def[col]] = 0;
          }
          counts.id_types[link.search_def[col]]++;
        } else {
          if (link.search_def[col]) counts[col]++;
        }
        if (link.search_def[col] && col == "location_country") console.log(link.search_def[col]);
      });

      let patternCol = "pattern_" + link.search_def.getSearchPattern();
      if (!counts.patterns[patternCol]) {
        counts.patterns[patternCol] = 0;
      }
      counts.patterns[patternCol]++;

    });

    console.log(counts);

    done();
  }

  _countSavedSearches(links, done) {

    //Ignorable: _ fields, drugs

    let cols = SavedSearchDef.getFields();

    let counts = {
      patterns: {}
    };

    //Initialize counts
    cols.forEach((col) => {
      counts[col] = 0;
    })

    links.forEach((link) => {

      cols.forEach((col) => {
        if (link.search_def[col]) counts[col]++;
        if (link.search_def[col] && col == "keyword") console.log(link.search_def[col]);
      });

      let patternCol = "pattern_" + link.search_def.getSearchPattern();
      if (!counts.patterns[patternCol]) {
        counts.patterns[patternCol] = 0;
      }
      counts.patterns[patternCol]++;

    });

    console.log(counts);
/*

 */

    done();
  }


  process(done) {
    let links = {};

    try {
      links = require(this.inputFile);
    } catch(err) {
      return done(err);
    }

    let savedSearches = [];
    let ctSearchLinks = [];

    links.forEach((linkRecord) => {
      if (linkRecord["search_url_type"] == "SavedSearch") {
        linkRecord.search_def = SavedSearchDef.fromJSON(this.nciPDQMapper, linkRecord.search_def);
        savedSearches.push(linkRecord); 
      } else if (linkRecord["search_url_type"] == "CTLink") {
        linkRecord.search_def = CTLinkSearchDef.fromJSON(this.nciPDQMapper, linkRecord.search_def);
        ctSearchLinks.push(linkRecord);
      } else {
        done(new Error("Unknown link type"));
      }
    });

    //"search_url_type":"CTLink"
    //"search_url_type":"SavedSearch"
    /*
    this._countSavedSearches(savedSearches, () => {



      done();
    })
    */
    this._countPatterns(links, () => {



      done();
    })
    
  }
}

function LinkOutputStats(program) {

  program
    .command('link-output-stats <input>')
    .version('0.0.1')
    .description(' \
      Mainly a test harness for building a link processor. \
    ')
    .action((input, cmd) => {
            
      try {
        let nciPDQMapper = new NciPdqMap();

        let processor = new LinkOutputProcessor(nciPDQMapper, {
          inputFile: input
        });

        processor.process((err, res) => {
          if (err) {
            throw err;
          }

          //Exit
          console.log("Finished.  Exiting...")
          process.exit(0);
        });
      } catch (err) {
        console.error(colors.red(err.message));
        console.error(colors.red("Errors occurred.  Exiting"));
        process.exit(1);
      }
    })
}

