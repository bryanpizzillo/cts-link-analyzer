'use strict';

const _         = require('lodash');
const async     = require('async');
const colors    = require('colors');
const cheerio   = require('cheerio');
const request   = require('request');
const url       = require('url');
const XLSX      = require('xlsx');

const TDSProtocolSearchSvc = require('../lib/tds-protocol-search-svc');

module.exports = TestTDSSvc;

function TestTDSSvc(program) {

  program
    .command('test-tds-svc <protocolSearchID>')
    .version('0.0.1')
    .description(' \
        Tests SQL connectivity and ability to get Protocol Search Def. \
    ')
    .action((protocolSearchID, cmd) => {

      if (
        (!cmd.parent.server || cmd.parent.server == "" ) ||
        (!cmd.parent.user || cmd.parent.user == "" ) || 
        (!cmd.parent.passwd || cmd.parent.passwd == "" ) ||
        (!cmd.parent.port || cmd.parent.port == "" )
      ) {
        console.error(colors.red('Invalid server, username or password'));
        program.help();
      }

      console.log(`Server: ${cmd.parent.server}`);
      console.log(`User: ${cmd.parent.user}`);
      console.log(`PW: ${cmd.parent.passwd}`);
      console.log(`Port: ${cmd.parent.port}`);


      try {

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

        svc.getProtocolSearchDef(protocolSearchID, (err, res) => {
          if (err) {
              throw err;
          }

          console.log(res);
          
          //Handle whatever with res.
          //console.log(res);
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