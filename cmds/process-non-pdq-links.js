'use strict';

const _         = require('lodash');
const async     = require('async');
const colors    = require('colors');
const cheerio   = require('cheerio');
const request   = require('request');
const url       = require('url');
const XLSX      = require('xlsx');


module.exports = ProcessNonPDQLinks;

const CGOV_RESULTS_FOUND_STRING = /\s*Results\s+\d+-\d+ of (\d+) for your search/;
const CGOV_NO_RESULTS_STRING = /\s*No results found\.\s*/;

class NonPDQLinkProcessor {
    constructor(options) {
        this.inputFile = options.inputFile;
        this.outputFile = options.outputFile;
    }

    _processCTLink(linkRecord, done) {
        done();

        /*
        PARAMS:
        id & idtype -- (int, int) If one is set they are required, but neither have to be set 
                None = 0,
                Drug = 1,
                Institution = 2,
                LeadOrganization = 3,
                Investigator = 4,
                Intervention = 5
        
        format -- (int) 1 (Patient) or 2(Health Professional)  required
        diagnosis -- (int) not required, but must be int.
        tt -- (int) trial type.  (Need to see what that maps to...)
        phase -- (int) trial phase (need to create map)
        ncc -- (int) NIH Clinical Center Only; any non-zero value is converted to true
        closed -- flag as invalid field
        new -- (int) New Trials Only; any non-zero value is converted to true.
        cn -- (int) Country (srsly?);  See ClinicalTrialsSearchLinkCountry <-- default option == U.S.A.
            Well, this is silly.  you can pass in cn.  Then we require it to be an int. then we completely
            forget that you specified anything and set it to U.S.A.
        */
    }

    _processSavedSearch(linkRecord, done) {
        done();
    }

    /**
     * Gets the count of trials from the CGOV site
     * 
     * @param {any} url
     * @param {any} done
     * 
     * @memberOf NonPDQLinkProcessor
     */
    _updateCGovTrialCount(linkRecord, done) {
        console.log(`Fetching ${linkRecord.url}`);
        //Using Request module because it handles redirects.
        request('https://www.cancer.gov' + linkRecord.url, (err, res, body) => {
            if (err) {
                return done(err);
            }

            if (res.statusCode != 200) {
                console.error(`Not good status: ${res.statusCode}`);
            }

            let $ = cheerio.load(body);

            //0 Results   No results found.
            //Any results   Results 1-25 of 5120 for your search:

            let resultStr = $('h5').text();
            
            if (!resultStr) {
                console.error('No Result String');                
            } else if (resultStr.match(CGOV_NO_RESULTS_STRING)) {
                console.log('0 results');
            } else if (resultStr.match(CGOV_RESULTS_FOUND_STRING)) {
                linkRecord.cgov_trial_count = resultStr.match(CGOV_RESULTS_FOUND_STRING)[1];
                console.log(`${linkRecord.cgov_trial_count} results.`)
            } else {
                //Encontered unexpected text.
                done(new Error(`Unknown CGOV result response: ${resultStr}`));
            }




            done();
        });
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
    _processLink(linkRecord, done) {

        async.waterfall([
            // STEP 1. Get the CGov trial count for this link record.
            (next) => { this._updateCGovTrialCount(linkRecord, next) },

            // STEP 2. Get the search params for the record
            (next) => {
                //Determine how to process it.
                switch(linkRecord.parsed_url.pathname.toLowerCase()) {
                    case "/search/clinicaltrialslink":
                    case "/search/clinicaltrialslink.aspx":
                        return this._processCTLink(linkRecord, next);
                    case "/search/resultsclinicaltrials.aspx":
                    case "/about-cancer/treatment/clinical-trials/search/results":
                    case "/clinicaltrials/search/results":
                        return this._processSavedSearch(linkRecord, next);
                    default:
                        //We should hard fail here and the code can be tweaked to support the new
                        //pattern.
                        return next(new Error(`Unknown pathname, ${link.pathname}`)); 
                }
            }
            // STEP 3. Determine Similar API params
            // STEP 4. Get API Trial Counts
        ], done
        )
    }

    process(done) {
        var workbook = XLSX.readFile(this.inputFile);

        /* Get worksheet */
        var worksheet = workbook.Sheets["CGOV"];

        let sheetObj = XLSX.utils.sheet_to_json(worksheet);

        //Convert each sheet row into a new object, which we will
        //use to resave the worksheet.
        async.mapSeries(sheetObj,
            (item, cb) => {
                let linkRecord = {
                    url: item['bad link'],
                    cgov_trial_count: 0,
                    api_trial_count: 0,
                    comment: item['Comment'],
                    new_url: item['NEW URL'],
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
                    'Type': item['Type'],
                    parsed_url: url.parse(item['bad link'], true),
                    api_params: {}
                };
                //Process the link and "return" the transformed linkRecord once done
                this._processLink(linkRecord, (err) => {
                    if (err) {
                        return cb(err);
                    }

                    return cb(null, linkRecord);
                });
            },
            //SO THIS SHOULD ACTUALLY SAVE OUT A NEW SHEET
            done
        )
    }
}

function ProcessNonPDQLinks(program) {

    program
        .command('process-non-pdq-links <input> <output>')
        .version('0.0.1')
        .description(' \
            Processes a spreadsheet containing non-pdq links to clinical trial searches in \
            order to analyze how many trials are returned by CGov, if there is a CTAPI mapping, \
            and if so how many trials are in the API. \
        ')
        .action((input, output, cmd) => {
            let processor = new NonPDQLinkProcessor({
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