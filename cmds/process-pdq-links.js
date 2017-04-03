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
const TDSProtocolSearchSvc  = require('../lib/tds-protocol-search-svc');

module.exports = ProcessPDQLinks;

const CGOV_RESULTS_FOUND_STRING = /\s*Results\s+\d+-\d+ of (\d+) for your search/;
const CGOV_NO_RESULTS_STRING = /\s*No results found\.\s*/;




function ProcessPDQLinks(program) {

    program
        .command('process-pdq-links <input> <output>')
        .version('0.0.1')
        .description(' \
            Processes a spreadsheet containing pdq links to clinical trial searches in \
            order to analyze how many trials are returned by CGov, if there is a CTAPI mapping, \
            and if so how many trials are in the API. \
        ')
        .action((input, output, cmd) => {

            //Check input params.
            if (
                (!cmd.parent.server || cmd.parent.server == "" ) ||
                (!cmd.parent.user || cmd.parent.user == "" ) || 
                (!cmd.parent.passwd || cmd.parent.passwd == "" ) ||
                (!cmd.parent.port || cmd.parent.port == "" )
            ) {
                console.error(colors.red('Invalid server, username or password'));
                program.help();
            }

            //Initialize the search service            
            let svc = new TDSProtocolSearchSvc(
                cmd.parent.user, 
                cmd.parent.passwd, 
                cmd.parent.server,
                cmd.parent.port,
                (err) => {
                    if (err) {
                    throw err;
                    }
                }
            );

            let processor = new NonPDQLinkProcessor(svc, {
                inputFile: input,
                outputFile: output
            });            

            try {
                processor.process((err, res) => {
                    if (err) {
                        throw err;
                    }

                    //Handle whatever with res.
                    //console.log(res);

                    //Clean up the search svc
                    svc.dispose();

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