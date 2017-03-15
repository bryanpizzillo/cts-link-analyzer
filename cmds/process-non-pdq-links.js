'use strict';

const _         = require('lodash');
const async     = require('async');
const colors    = require('colors');
const cheerio   = require('cheerio');
const request   = require('request');
const url       = require('url');
const XLSX      = require('xlsx');

const CTLinkSearchDef       = require('../lib/ctlink-search-def');
const SavedSearchDef        = require('../lib/saved-search-def');
const TDSProtocolSearchSvc  = require('../lib/tds-protocol-search-svc');

module.exports = ProcessNonPDQLinks;

const CGOV_RESULTS_FOUND_STRING = /\s*Results\s+\d+-\d+ of (\d+) for your search/;
const CGOV_NO_RESULTS_STRING = /\s*No results found\.\s*/;

class NonPDQLinkProcessor {
    constructor(svc, options) {
        this.searchDefSvc = svc;
        this.inputFile = options.inputFile;
        this.outputFile = options.outputFile;
    }

    _processCTLink(linkRecord, done) {
        
        let params = linkRecord.parsed_url.query;

        linkRecord.search_def = new CTLinkSearchDef(params);

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

        let params = linkRecord.parsed_url.query;

        linkRecord.search_def = new SavedSearchDef(this.searchDefSvc, params.protocolsearchid, (err) => {

            if (err) {
                return done(err);
            }

            done();
        });                
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
                        linkRecord.search_url_type = 'CTLink';
                        return this._processCTLink(linkRecord, next);
                    case "/search/resultsclinicaltrials.aspx":
                    case "/about-cancer/treatment/clinical-trials/search/results":
                    case "/clinicaltrials/search/results":
                        linkRecord.search_url_type = 'SavedSearch';
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

    _saveWorkbook(data, cols, done) {
        let wb = {};
        wb.Sheets = {};
        wb.SheetNames = [];

        let ws_name = "Sheet1";

        let ws = {};

        let range = {s: {c:0, r:0}, e: {c:0, r:0 }};

        for(let R = 0; R != data.length; ++R) {
            if (range.e.r < R) range.e.r = R;
            for(var C = 0; C != COLS.length; ++C) {
                if (range.e.c < C) range.e.c = C;

                /* create cell object: .v is the actual data */
                var cell = { v: data[R][COLS[C]] };
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

        done();        
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
                    'Type': item['Type'],
                    parsed_url: url.parse(item['bad link'], true),
                    search_url_type: 'UNK',
                    search_type: 'UNK',
                    search_link_params: {},
                    search_def: false, 
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
            (err, links) => {
                if (err) {
                    return done(err);
                }



                //Commenting out so we can do some counts.
                /*
                this._saveWorkbook(
                    links,
                    [
                        'url', 'cgov_trial_count', 'api_trial_count', 'new_url',
                        'comment', 'bp_text', 'ref_url', 'ref_contentid', 'ref_contentType',
                        'ref_title', 'ref_statename', 'By Cancer Type', 'Stage Subtype', 'By Trial Type',                        
                        'Trial Phase', 'Treatment / Intervention', 'Lead Org', 'Keywords / Phrases',
                        'USA only', 'No Results', 'protocolsearchid', 'IDstring', 'Type'
                    ], 
                    done
                );
                */

                done();
            }
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