require("ts-node/register");
if (process.argv.find(arg => arg == '--graphile_worker'))
    require("./graphile_worker");
else require("./main");
