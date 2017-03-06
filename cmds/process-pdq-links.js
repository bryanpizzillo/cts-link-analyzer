'use strict';

module.exports = ProcessPDQLinks;



function ProcessPDQLinks(program) {

    program
        .command('process-pdq-links <input>')
        .version('0.0.1')
        .description(' \
            Processes a spreadsheet containing pdq links to clinical trial searches in \
            order to analyze how many trials are returned by CGov, if there is a CTAPI mapping, \
            and if so how many trials are in the API. \
        ')
        .action((query, cmd) => {
            //Do stuff.
        })
}