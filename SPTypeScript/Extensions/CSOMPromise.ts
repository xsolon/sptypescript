/// <reference path="../Definitions/jQuery.d.ts" />
/// <reference path="../Definitions/SP.Init.d.ts" />
/// <reference path="../Definitions/SP.d.ts" />

module SP {

    // Class
    export class ClientContextPromise extends SP.ClientContext {
        /** To use this function, you must ensure that jQuery and CSOMPromise js files are loaded to the page */
        executeQueryPromise(): JQueryPromise {
            var deferred = new jQuery.Deferred();
            this.executeQueryAsync(function (sender, args) {
                deferred.resolve(sender, args);
            },
            function (sender, args) {
                deferred.reject(sender, args);
            })
            return deferred.promise();
        }

        constructor(serverRelativeUrlOrFullUrl: string) {
            super(serverRelativeUrlOrFullUrl);
        }

        static get_current(): ClientContextPromise {
            return new ClientContextPromise(_spPageContextInfo.siteServerRelativeUrl);
        }

    }

}
SP.SOD.notifyScriptLoadedAndExecuteWaitingJobs("CSOMPromise.ts");