/*************************************************************************
## Commando Plugin

### Description

commando is a plugin which can be used to add completely new commands
to Minecraft.  Normally ScriptCraft only allows for provision of new
commands as extensions to the jsp command. For example, to create a
new simple command for use by all players...

    /js command('hi', function(args,player){ echo( player, 'Hi ' + player.name); });
  
... then players can use this command by typing...

    /jsp hi

... A couple of ScriptCraft users have asked for the ability to take
this a step further and allow the global command namespace to be
populated so that when a developer creates a new command using the
'command' function, then the command is added to the global command
namespace so that players can use it simply like this...

    /hi

... As ScriptCraft users have suggested, it should be at the
discretion of server administrators as to when overriding or adding
new commands to the global namespace is good.

So this is where `commando()` comes in. It uses the exact same
signature as the core `command()` function but will also make the
command accessible without the `jsp` prefix so instead of having to
type `/jsp hi` for the above command example, players simply type
`/hi` . This functionality is provided as a plugin rather than as part
of the ScriptCraft core.

### Example hi-command.js

    var commando = require('../commando');
    commando('hi', function(args,player){
       echo( player, 'Hi ' + player.name);
    });

...Displays a greeting to any player who issues the `/hi` command.

### Example - timeofday-command.js 

    var times = {Dawn: 0, Midday: 6000, Dusk: 12000, Midnight:18000};
    commando('timeofday', function(params,player){
           player.location.world.setTime(times[params[0]]);
       },
       ['Dawn','Midday','Dusk','Midnight']);

... changes the time of day using a new `/timeofday` command (options are Dawn, Midday, Dusk, Midnight)

***/
if (__plugin.canary){
  console.warn('commando plugin is not yet supported in CanaryMod');
  return;
}
var commands = {};

exports.commando = function( name, func, options, intercepts ) {
  var result = command( name, func, options, intercepts );
  
  if (name.toLowerCase() == "js" || name.toLowerCase() == "jsp") return;
  
  // this hack for registering commands is loosely based on https://bukkit.org/threads/how-to-get-commandmap-with-default-commands.122746/
  var manager = server.getPluginManager();
  var mclass = manager.getClass();
  if (mclass.getName().endsWith('.SimplePluginManager')) {
    var cmfield = mclass.getDeclaredField("commandMap");
    cmfield.setAccessible(true);
    var commandmap = cmfield.get(manager);
    
    // re-register the jsp command under the new name
    commandmap.register(name, "jsp", commandmap.getCommand("jsp"));
  }
  else {
    // fallback to old PlayerCommandPreprocessEvent behavior
    commands[name] = result;
  }
  return result;
};

events.playerCommandPreprocess( function( evt ) {
  var msg = '' + evt.message;
  var parts = msg.match( /^\/([^\s]+)/ );
  if ( !parts ) {
    return;
  }
  if ( parts.length < 2 ) {
    return;
  }
  var command = parts[1];
  if ( commands[command] ) {
    evt.message = '/jsp ' + msg.replace( /^\//, '' );
  }
} );
events.serverCommand( function( evt ) {
  var msg = '' + evt.command;
  var parts = msg.match( /^\/*([^\s]+)/ );
  if ( !parts ) {
    return;
  }
  if ( parts.length < 2 ) {
    return;
  }
  var command = parts[1];
  if ( commands[ command ] ) {
    var newCmd = 'jsp ' + msg.replace( /^\//, '' );
    if ( config.verbose ) {
      console.log( 'Redirecting to : %s', newCmd );
    }
    evt.command = newCmd;
  }
});
