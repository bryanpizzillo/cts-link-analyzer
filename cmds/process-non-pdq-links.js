'use strict';

const _             = require('lodash');
const async         = require('async');
const colors        = require('colors');
const cheerio       = require('cheerio');
const fs            = require('fs');
const JSONStream    = require('JSONStream');
const path          = require('path');
const request       = require('request');
const url           = require('url');
const XLSX          = require('xlsx');


const LinkDB       = require('../lib/linkdb');

module.exports = ProcessNonPDQLinks;

const PATTERNS = [
  'Diag', 'TrialType', 'ClinCtr', 'IsNew', 'Intr', 'Drug', 'Phase'
];

/**
 * Process a collection on non-PDQ clinical trial links.
 * 
 * @class NonPDQLinkProcessor
 */
class NonPDQLinkProcessor {

    /**
     * Creates an instance of NonPDQLinkProcessor.
     * 
     * @param {any} linkdb A link database class instance (with data)
     * @param {any} options Options for this processor (inputFile & outputFile)
     * 
     * @memberOf NonPDQLinkProcessor
     */
    constructor(linkdb, options) {
        this.linkDB = linkdb;
        this.inputFile = options.inputFile;
        this.outputFile = options.outputFile;
    }

    /**
     * Saves out a workbook with the enriched link info
     * 
     * @param {any} data
     * @param {any} cols
     * 
     * @memberOf NonPDQLinkProcessor
     */
    _saveWorkbook(data, cols) {
        let wb = {};
        wb.Sheets = {};
        wb.SheetNames = [];

        let ws_name = "Sheet1";

        let ws = {};

        let range = {s: {c:0, r:0}, e: {c:0, r:0 }};

        for(let R = 0; R != data.length; ++R) {
            if (range.e.r < R) range.e.r = R;
            for(var C = 0; C != cols.length; ++C) {
                if (range.e.c < C) range.e.c = C;

                /* create cell object: .v is the actual data */
                var cell = { v: data[R][cols[C]] };
                if(cell.v == null) continue;

                /* create the correct cell reference */
                var cell_ref = XLSX.utils.encode_cell({c:C,r:R});

                /* determine the cell type */
                if(typeof cell.v === 'number') cell.t = 'n';
                else if(typeof cell.v === 'boolean') cell.t = 'b';
                else cell.t = 's';

                /* add to structure */
                ws[cell_ref] = cell;
            }            
        }

        ws['!ref'] = XLSX.utils.encode_range(range);

        /* add worksheet to workbook */
        wb.SheetNames.push(ws_name);
        wb.Sheets[ws_name] = ws;

        /* write file */
        XLSX.writeFile(wb, this.outputFile);
    }

    /**
     * Get a nice display label for the pattern
     * 
     * @param {any} link
     * @returns
     * 
     * @memberOf NonPDQLinkProcessor
     */
    _getPrettyPattern(link) {
      let patternVal = link.search_def.getSearchPattern();
      let patternCol = '';

      if (patternVal != 'MANUAL') {
        for (let i=0; i< PATTERNS.length; i++) {        
          //If this is one of the patterns, then add it to the string.
          if (patternVal & Math.pow(2, i)) {
            if (patternCol != '') { patternCol += '_' }

            patternCol += PATTERNS[i];
          }
        }
      } else { patternCol = 'MANUAL' }

      return patternCol;        
    }

    /**
     * Process the input worksheet and enrich the link records outputting a 
     * new spreadsheet.
     * 
     * @memberOf NonPDQLinkProcessor
     */
    process() {
        var workbook = XLSX.readFile(this.inputFile);

        /* Get worksheet */
        var worksheet = workbook.Sheets["CGOV"];

        let sheetObj = XLSX.utils.sheet_to_json(worksheet);

        //Convert each sheet row into a new object, which we will
        //use to resave the worksheet.
        let links = sheetObj.map( (item) => {

            let linkRecord = {
                url: item['bad link'],
                new_url: item['NEW URL'],
                comment: item['Comment'],
                bp_text: item['Boiler Plate Text'],
                ref_url: item['url used on'],
                ref_contentid: item['contentid'],
                ref_contentType: item['contenttypename'],
                ref_title: item['title'],
                ref_statename: item['statename'],
                'By Cancer Type': item['By Cancer Type'],
                'Stage Subtype': item['Stage Subtype'],
                'By Trial Type': item['By Trial Type'],
                'Trial Phase': item['Trial Phase'],
                'Treatment / Intervention': item['Treatment / Intervention'],
                'Lead Org': item['Lead Org'],
                'Keywords / Phrases': item['Keywords / Phrases'],
                'USA only': item['USA only'],
                'No Results': item['No Results'],
                'protocolsearchid': item['protocolsearchid'],
                'IDstring': item['IDstring'],
                'Type': item['Type']
            };

            //Add in info from linkDB
            let link = this.linkDB.getLink(linkRecord.url);

            if (!link) {
                throw new Error(`No link found for ${linkRecord.url}`);
            }
            
            linkRecord['Pattern'] = this._getPrettyPattern(link);
            linkRecord['cgov_trial_count'] = link.cgov_trial_count;

            return linkRecord;
        });

        this._saveWorkbook(
            links,
            [
                'url', 'Pattern', 'cgov_trial_count', 'new_url',
                'comment', 'bp_text', 'ref_url', 'ref_contentid', 'ref_contentType',
                'ref_title', 'ref_statename', 'By Cancer Type', 'Stage Subtype', 'By Trial Type',                        
                'Trial Phase', 'Treatment / Intervention', 'Lead Org', 'Keywords / Phrases',
                'USA only', 'No Results', 'protocolsearchid', 'IDstring', 'Type'
            ]
        );
    }
}

function ProcessNonPDQLinks(program) {

    program
        .option('-l --linkdb <linkdb>', 'Search Link Database')
        .command('process-non-pdq-links <input> <output>')
        .version('0.0.1')
        .description(' \
            Processes a spreadsheet containing non-pdq links to clinical trial searches in \
            order to analyze how many trials are returned by CGov, if there is a CTAPI mapping, \
            and if so how many trials are in the API. \
        ')
        .action((input, output, cmd) => {

            //Check input params.
            if (
                (!cmd.parent.linkdb || cmd.parent.linkdb == "" )
            ) {
                console.error(colors.red('A link database is required.'));
                program.help();
            }

            let linkdbpath = cmd.parent.linkdb;
            if (!linkdbpath.match(/^\//)) {
                linkdbpath = path.join(process.cwd(), linkdbpath);
            }

            let linkDB = LinkDB.loadFromFile(linkdbpath);

            let processor = new NonPDQLinkProcessor(linkDB, {
                inputFile: input,
                outputFile: output
            });            

            try {
                //This should not have any async tasks, so no reason to pass callback.
                processor.process();

                //Exit
                console.log("Finished.  Exiting...")
                process.exit(0);

            } catch (err) {
                console.error(colors.red(err.message));
                console.error(colors.red("Errors occurred.  Exiting"));
                process.exit(1);
            }
        })
}