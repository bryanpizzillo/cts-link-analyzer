'use strict';

const _         = require('lodash');
const XLSX      = require('xlsx');
const colors    = require('colors');
const url       = require('url');
const async     = require('async');
const request     = require('request');

module.exports = ProcessNonPDQLinks;

class NonPDQLinkProcessor {
    constructor(options) {
        this.inputFile = options.inputFile;
    }

    _processCTLink(link) {

    }

    _processSavedSearch(link) {

    }

    /**
     * Gets the count of trials from the CGOV site
     * 
     * @param {any} url
     * @param {any} done
     * 
     * @memberOf NonPDQLinkProcessor
     */
    _getCGovTrialCount(url, done) {

    }

    /**
     * Processes a clinical trials search link
     * 
     * @param {any} rawURL
     * @param {any} done
     * @returns
     * 
     * @memberOf NonPDQLinkProcessor
     */
    _processLink(rawURL, done) {

        //parse the link
        let link = url.parse(rawURL, true);

        async.waterfall([

        ], dnone()
        )

        //Determine how to process it.
        switch(link.pathname.toLowerCase()) {
            case "/search/clinicaltrialslink":
            case "/search/clinicaltrialslink.aspx":
                return this._processCTLink(link);
            case "/search/resultsclinicaltrials.aspx":
            case "/about-cancer/treatment/clinical-trials/search/results":
            case "/clinicaltrials/search/results":
                return this._processSavedSearch(link);
            default:
                console.error(colors.red(`Unknown pathname, ${link.pathname}`));
        }
    }

    process(done) {
        var workbook = XLSX.readFile(this.inputFile);

        var address_of_cell = 'A1';

        /* Get worksheet */
        var worksheet = workbook.Sheets["CGOV"];

        let sheetObj = XLSX.utils.sheet_to_json(worksheet);

        let uniquePaths = [];

        sheetObj.forEach((linkEntry) => {            
            var outLink = this._processLink(linkEntry["bad link"]);
        })

        console.log(uniquePaths);

        

        done();
    }
}

function ProcessNonPDQLinks(program) {

    program
        .command('process-non-pdq-links <input>')
        .version('0.0.1')
        .description(' \
            Processes a spreadsheet containing non-pdq links to clinical trial searches in \
            order to analyze how many trials are returned by CGov, if there is a CTAPI mapping, \
            and if so how many trials are in the API. \
        ')
        .action((input, cmd) => {
            let processor = new NonPDQLinkProcessor({
                inputFile: input
            });

            try {
                processor.process((err, res) => {
                    if (err) {
                        throw err;
                    }

                    //Handle whatever with res.

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