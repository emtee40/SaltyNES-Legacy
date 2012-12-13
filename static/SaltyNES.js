

var salty_nes = null;
var is_running = false;
var is_initialized = false;
var paintInterval = null;
var fpsInterval = null;
var gamepadInterval = null;
var vfps = 0;
var zoom = 1;
var max_zoom = 6;
var readers = [];
var gamepad_id = null;

function diff(a, b) {
	if(a > b)
		return a - b;
	else
		return b - a;
}

function get_keys(obj) {
	var keys = [];

	for(var key in obj) {
		if(obj.hasOwnProperty(key)) {
			keys.push(key);
		}
	}

	return keys;
}

function get_location_path(name) {
	return location.hash + '/' + name;
}

function load_game_library(letter, page) {
	// Get all the existing links in the library
	var game_library_list = $('#game_library_list');
	game_library_list[0].innerHTML = '';

	// Load all the new games into the selector
	var used_names = {};
	Games.for_each_with_letter(letter, {
		each: function(game) {
			if(letter != null) {
				if(letter == '#' && game.name.match('^[0-9]')) {
					// Numbers
				} else if(game.name[0].toUpperCase() == letter) {
					// Letter
				} else {
					return;
				}
			}

			// Skip this game if there is one with the same title already
			if(game.name in used_names)
				return;
			used_names[game.name] = null;

			var is_broken = false;
			var img = null;
			if(game.name in game_meta_data) {
				is_broken = game_meta_data[game.name]['is_broken'];
				img = game_meta_data[game.name]['img'];
			}

			// Put the icon in the selector
			var element = null;
			if(img) {
				var icon_class = is_broken ? 'game_icon broken' : 'game_icon';
				element = $('<a id="' + game.sha256 + '" href="#/Home/Games/' + game.name + '"><div class="' + icon_class + '"><img src="' + img + '" /><br />' + game.name  + '</div></a>');
			} else {
				element = $('<a id="' + game.sha256 + '" href="#/Home/Games/' + game.name + '"><div class="game_icon_none"><div>Unknown Game</div>' + game.name  + '</div></a>');
			}
			game_library_list.append(element);
		},
		after: function() {
			if(game_library_list[0].innerHTML == '') {
				game_library_list[0].innerHTML = 'There are no games.';
			}
		}
	});
}

function show_game_play(game) {
	Saves.find_by_id(game.sha256, function(save) {
		// get the save data with the newest date
		var save_ram = '';
		if(save) {
			save_ram = save.get_newest_save_ram() || '';
		}

		// Send the rom to the nexe
		salty_nes.postMessage('load_rom:' + save_ram + ' rom:' + game.data);
		salty_nes.postMessage('zoom:' + zoom);
	});
}

function show_game_info(game) {
	$('#about').hide();
	$('#game_selector').hide();
	$('#game_info').show();
	$('#top_controls').hide();
	$('#game_drop').hide();
	$('#game_library').hide();
	$('#home_controls').hide();
	hide_screen();

	// Disable the controls
	$('#game_play_button').attr('disabled', 'disabled');
	$('#game_play_version').attr('disabled', 'disabled');
	$('#game_play_save_span').hide();
	$('#lnk_remove_save').hide();

	// Quit running any existing game
	if(is_running)
		salty_nes.postMessage('quit');

	// Fill in name and region
	$('#game_name')[0].innerHTML = game.name;
	$('#game_region')[0].innerHTML = game.region;

	// Fill in other info
	fields = ["developer", "publisher", "release_date", "number_of_players", 
			"can_save", "mapper", "prog_rom_pages", "char_rom_pages", 
			"link", "img"];
	for(i=0; i<fields.length; i++) {
		var field = fields[i];
		var value = '...';
		if(game.name in game_meta_data)
			value = game_meta_data[game.name][field];
		$('#game_' + field)[0].innerHTML = value;
	}

	// Get link and img
	var link = '';
	var img = null;
	var can_save = false;
	if(game.name in game_meta_data) {
		link = game_meta_data[game.name]['link'];
		img = game_meta_data[game.name]['img'];
		can_save = game_meta_data[game.name]['can_save'];
	}

	// Fill in the image and link to wikipedia
	$('#game_link')[0].innerHTML = "<a href=\"" + link + "\">Wikipedia</a>";
	if(img) {
		$('#game_img')[0].innerHTML = "<img src=\"" + img + "\" width=\"200\"/>";
	} else {
		$('#game_img')[0].innerHTML = "<div style=\"width: 120px; height: 177px; border: 1px solid black;\">Unknown Game</div>";
	}

	// Game versions
	$('#game_play_version').empty();
	var versions = {};
	var counter = 1;
	Games.for_each_with_name(game.name, {
		each: function(g) {
			var key = g.region + ' ' + g.version;
			if(key == ' ')
				key = 'Unknown ' + counter;
			versions[key] = g.sha256;
			counter++;
		},
		after: function() {
			// Sort then and put them in the select
			var keys = get_keys(versions).sort();
			for(var i=0; i<keys.length; i++) {
				var key = keys[i];
				$('#game_play_version')
					.append($("<option></option>")
					.attr("value", versions[key])
					.text(key));
			}

			// Set the selected option
			$('#game_play_version option').filter(function() {
				return this.text == 'USA Verified Good Dump';
			}).attr('selected', true);

			// Update the play button when the select changes
			$('#game_play_version').unbind('change');
			$('#game_play_version').change(function() {
				var href = '#/Home/Games/' + game.name + '/?Play=' + $('#game_play_version').val();
				$('#game_play_button').attr('href', href);
			});

			// Play button initial value
			var href = '#/Home/Games/' + game.name + '/?Play=' + $('#game_play_version').val();
			$('#game_play_button').attr('href', href);

			// Enable the controls
			$('#game_play_button').removeAttr('disabled');
			$('#game_play_version').removeAttr('disabled');
		}
	});
	
	// Save remove button
	var lnk_remove_save = $('#lnk_remove_save');
	lnk_remove_save.unbind('click');
	lnk_remove_save.click(function() {
		// Have the user confirm
		if(!confirm("Remove your save data?")) {
			return;
		}

		// Remove the save
		Saves.find_by_id(game.sha256, function(save) {
			save.destroy(function(save) {
				lnk_remove_save.hide();
				$('#game_play_save')
					.find('option')
					.remove();
				$('#game_play_save_span').hide();
				alert('Save data removed.');
			});
		});
	});
	Saves.find_by_id(game.sha256, function(save) {
		if(save != null) {
			$('#game_play_save')
				.find('option')
				.remove();
			var keys = Object.keys(save.data);
			for(var i=keys.length-1; i>=0; --i) {
				var key = keys[i];
				$('#game_play_save')
					.append($("<option></option>")
					.attr("value", save.data[key])
					.text(key));
			}
			lnk_remove_save.show();
			$('#game_play_save_span').show();
		} else {
			lnk_remove_save.hide();
			$('#game_play_save_span').hide();
		}
	});

	document.title = game.name + ' - SaltyNES';
}

function show_home() {
	document.title = 'SaltyNES - A NES emulator in the browser'

	// Empty the fields for showing a game
	var fields = ["name", "region"];
	for(i=0; i<fields.length; i++) {
		$('#game_' + fields[i])[0].innerHTML = '';
	}

	// Show all the games
	$('#about').hide();
	$('#game_selector').show();
	$('#game_info').hide();
	$('#top_controls').hide();
	$('#game_drop').hide();
	$('#game_library').hide();
	$('#home_controls').show();
	hide_screen();

	// Quit running any existing game
	if(is_running)
		salty_nes.postMessage('quit');
}

function show_about() {
	document.title = 'About - SaltyNES';
	
	$('#about').show();
	$('#game_selector').hide();
	$('#game_info').hide();
	$('#top_controls').hide();
	$('#game_drop').hide();
	$('#game_library').show();
	$('#home_controls').hide();
	hide_screen();
}

function show_library_default() {
	document.title = 'Games - SaltyNES';

	$('#about').hide();
	$('#game_selector').show();
	$('#game_info').hide();
	$('#top_controls').hide();
	$('#game_drop').hide();
	$('#game_library').show();
	$('#home_controls').hide();
	hide_screen();

	// Quit running any existing game
	if(is_running)
		salty_nes.postMessage('quit');

	var game_library_list = $('#game_library_list');
	game_library_list[0].innerHTML = 'Select a letter to list games.';
}

function show_library_by_letter(letter, page) {
	document.title = letter + ' Games - SaltyNES';

	$('#about').hide();
	$('#game_selector').show();
	$('#game_info').hide();
	$('#top_controls').hide();
	$('#game_drop').hide();
	$('#game_library').show();
	$('#home_controls').hide();
	hide_screen();

	// Quit running any existing game
	if(is_running)
		salty_nes.postMessage('quit');

	load_game_library(letter, page);
}

function show_drop() {
	document.title = 'Add Games - SaltyNES';

	$('#about').hide();
	$('#game_selector').show();
	$('#game_info').hide();
	$('#top_controls').hide();
	$('#game_drop').show();
	$('#game_library').hide();
	$('#home_controls').hide();
	hide_screen();

	// Quit running any existing game
	if(is_running)
		salty_nes.postMessage('quit');
}

function hide_screen() {
	$('#SaltyNESApp')[0].className = 'screen_hidden';
	$('#SaltyNESApp').width(2);
	$('#SaltyNESApp').height(2);
	
	$('#SaltyNESApp').css('top', 0);
	$('#SaltyNESApp').css('left', 0);
}

function show_screen() {
	$('#SaltyNESApp')[0].className = 'screen_running';
	$('#SaltyNESApp').width(256 * zoom);
	$('#SaltyNESApp').height(240 * zoom);
}

function handleLibraryDragEnter(event) {
	// Do nothing
	event.stopPropagation();
	event.preventDefault();
}

function handleLibraryDragExit(event) {
	// Do nothing
	event.stopPropagation();
	event.preventDefault();
}

function handleLibraryDragOver(event) {
	// Do nothing
	event.stopPropagation();
	event.preventDefault();
}

function handleLibraryDrop(event) {
	// Do nothing
	event.stopPropagation();
	event.preventDefault();

	var files = event.dataTransfer.files;
	if(files.length > 0)
		handleLibraryFiles(files);
}


function handleLibraryFiles(files) {
	function runNextReader() {
		if(readers.length > 0) {
			var next = readers.pop();
			next['reader'].readAsDataURL(next['file']);
		}
	}

	// Read the files
	for(i=0; i<files.length; i++) {
		// Make sure only *.NES files are sent
		if(!files[i].name.toLowerCase().match(/\.nes$/)) {
			alert('Only games with a .nes file extension can be used. The file "' + files[i].name + '" is not valid.');
			continue;
		}
		
		$('#game_drop_loading').show();
		var reader = new FileReader();
		reader.file_name = files[i].name;

		reader.onprogress = function(event) {
			if(event.lengthComputable) {
				var loaded = (event.loaded / event.total);
			}
		};

		reader.onloadend = function(event) {
			// Convert the game from data uri to binary
			var header = event.target.result.split(',')[0];
			var mime_type = header.split(':')[1].split(';')[0];
			var base64 = event.target.result.slice(header.length+1);
			var data = CryptoJS.enc.Base64.parse(base64);
		
			// Get the sha256 of the data
			var sha256 = CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);

			// Save the base64ed game in the database
			var game = new Games(sha256);
			// Game in database
			if(game_database[sha256] != undefined) {
				game.copy_values_from_game(game_database[sha256]);
			// Game not in database
			} else {
				game.name = event.target.file_name;
			}
			game.data = base64;

			game.save({success: function(game) {
				$('#debug')[0].innerHTML = "Loaded '" + game.name + "'";
	
				// Start the next reader, if there is one
				runNextReader();

				if(readers.length == 0)
					$('#game_drop_loading').hide();
			}, failure: function(game, error_message) {
				if(error_message != 'Save failed: 4')
					alert('Failed to save game. Error code: ' + error_message);
				// Start the next reader, if there is one
				runNextReader();

				if(readers.length == 0)
					$('#game_drop_loading').hide();
			}});
		}

		// Add this reader to the list of readers
		readers.push({ 'reader' : reader, 'file' : files[i] });
	}

	// Start the first reader
	runNextReader();
}

function handleKeyDown(event) {
	// Let the browser handle Fn keys
	if(event.which >= 112 && event.which <= 123)
		return true;

	if(!is_running) return false;
	salty_nes.postMessage('key_down:' + event.which);
	return false;
}

function handleKeyUp(event) {
	// Let the browser handle Fn keys
	if(event.which >= 112 && event.which <= 123)
		return true;

	if(!is_running) return false;
	salty_nes.postMessage('key_up:' + event.which);
	return false;
}

function handlePauseClick() {
	if(!is_running) return false;

	salty_nes.postMessage('pause');
	var pause = $('#pause');
	if(pause.text() == 'Pause') {
		pause.text('Unpause');
	} else {
		pause.text('Pause');
	}

	return false;
}

function handlePageDidUnload() {
	if(paintInterval) {
		clearInterval(paintInterval);
		paintInterval = null;
	}

	if(fpsInterval) {
		clearInterval(fpsInterval);
		fpsInterval = null;
	}

	if(gamepadInterval) {
		clearInterval(gamepadInterval);
		gamepadInterval = null;
	}
}

function handleNaclMessage(message_event) {
	if(message_event.data == null)
		return;

	if(message_event.data.split(':')[0] == 'get_fps') {
		var fpsdebug = $('#fpsdebug')[0];
		fpsdebug.innerHTML = 'FPS: ' + vfps + ', VFPS: ' + message_event.data.split(':')[1];
		vfps = 0;
	} else if(message_event.data.split(':')[0] == 'get_sha256') {
		// FIXME: remove this
	} else if(message_event.data.split(':')[0] == 'get_gamepad_status') {
		var status = message_event.data.split(':')[1];
		var new_gamepad_id = message_event.data.split(':')[2];
		if(status == "yes") {
			$('#gamepad_indicator').show();
		} else {
			$('#gamepad_indicator').hide();
		}

		// Update the key bindings if this is a new gamepad
		if(is_running && new_gamepad_id && new_gamepad_id != gamepad_id) {
			var buttons = null;
			if(new_gamepad_id in gamepad_database) {
				buttons = gamepad_database[new_gamepad_id]['input_map'];
			} else {
				buttons = gamepad_database['unknown']['input_map'];
			}
			for(var key in buttons) {
				for(var i=0; i<buttons[key].length; i++) {
					salty_nes.postMessage('set_input_' + key + ':' + buttons[key][i]);
				}
			}
			gamepad_id = new_gamepad_id;
		}
	} else if(message_event.data == 'running') {
		is_running = true;

		// Repaint the screen
		// FIXME: Paint calls should happen automatically inside the nexe.
		var fps = 60.0;
		paintInterval = setInterval(function() {
			salty_nes.postMessage('paint');
			vfps += 1;
		}, 1000.0 / fps);

		// Have the FPS sent to us every second
		// FIXME: This should just be sent from the nexe directly
		fpsInterval = setInterval(function() {
			salty_nes.postMessage('get_fps');
		}, 1000);

		// Make the pause button clickable
		$('#pause').attr('disabled', false);
		
		// Get the rom sha256
		salty_nes.postMessage('get_sha256');

		$('#game_info').hide();
		$('#top_controls').show();
		show_screen();
		handleWindowResize();

		var debug = $('#debug')[0];
		debug.innerHTML = 'Running';
	} else if(message_event.data == 'quit') {
		is_running = false;
		if(paintInterval) {
			clearInterval(paintInterval);
			paintInterval = null;
		}
		if(fpsInterval) {
			clearInterval(fpsInterval);
			fpsInterval = null;
		}

		var debug = $('#debug')[0];
		debug.innerHTML = 'Ready';
	} else if(message_event.data.split(':')[0] == 'save') {
		var sha256 = message_event.data.split('save:')[1].split(' data:')[0];
		var save_ram = message_event.data.split(' data:')[1];

		Saves.find_by_id(sha256, function(save) {
			var timestamp = new Date();
			
			if(save != null) {
				save.data[timestamp] = save_ram;
	
				save.update({success: function(save) {
					// Updated successfully
				}});
			} else {
				save = new Saves(sha256);
				save.data[timestamp] = save_ram;
	
				save.save({success: function(save) {
					// Saved successfully
				}});
			}
		});
	} else {
		var debug = $('#debug')[0];
		debug.innerHTML = message_event.data;
	}
}

function handleNaclProgress(event) {
	var debug = $('#debug')[0];
	// Print unknown progress if unknown
	if(!event.lengthComputable || event.total == 0) {
		debug.innerHTML = 'Loading ' + event.loaded + ' Bytes of unknown total size';
		return;
	}

	// Or print progress
	var progress = event.loaded / event.total * 100.0;
	debug.innerHTML = 'Loading ' + progress.toFixed(2) + '% ...';
}

function handleNaclLoadStart(event) {
	$('#nacl_not_enabled').hide();
}

function handleNaclLoadEnd() {
	salty_nes = $('#SaltyNESApp')[0];

	// Setup IndexedDB
	setup_indexeddb(handleHashChange);
}

function handleWindowResize() {
	if(screen.height != window.outerHeight) {
		$('#content').show();
		$('#nav').show();
		$('#footer').show();
		$('#bodyId').css('background-color', '#FFFFFF');
	}

	if(!is_running)
		return;

	var div_w = 0;
	var div_h = 0;
	var salty_nes_app = $('#SaltyNESApp');
	// Full screen uses the screen size
	if(screen.height == window.outerHeight) {
		div_w = screen.width;
		div_h = screen.height;
		
		// Get the largest zoom we can fit
		for(var i=1; i<=max_zoom; i++) {
			if(256 * i <= div_w && 240 * i <= div_h) {
				zoom = i;
			}
		}

		$('#content').hide();
		$('#nav').hide();
		$('#footer').hide();
		$('#bodyId').css('background-color', '#000000');
		$('#SaltyNESApp').css('top', 0);
		$('#SaltyNESApp').css('left', (screen.width/2) - ((256 * zoom)/2));
	// Not full screen uses the parent container size
	} else {
		div_w = $('#content').width();
		div_h = $(window).height() - diff($('#footer').height(), $('#content').height());
		
		// Get the largest zoom we can fit
		for(var i=1; i<=max_zoom; i++) {
			if(256 * i <= div_w && 240 * i <= div_h) {
				zoom = i;
			}
		}

		$('#SaltyNESApp').css('top', $('#content').height());
		$('#SaltyNESApp').css('left', ($('#content').width()/2) - ((256 * zoom)/2) + ($('#content').position().left));
	}

	salty_nes_app.width(256 * zoom);
	salty_nes_app.height(240 * zoom);
	salty_nes.postMessage('zoom:' + zoom);
}

function handleHashChange() {
	// Set the default hash
	if(location.hash == '') {
		location.hash = '#/Home';
		return;
	}

	// Get the page and sections
	var before = location.hash.split('#/')[1].split('?')[0];
	var after = '';
	if(location.hash.indexOf('?') != -1)
		after = location.hash.split('?')[1];
	var sha256 = null;
	if(location.hash.indexOf('?Play=') != -1) {
		sha256 = location.hash.split('?Play=')[1];
	}
	var page = parseInt(location.hash.split('?page=')[1]) || 1;

	// HTTP Path
	var sections = [];
	var parts = before.split('/');
	for(var i=0; i<parts.length; ++i) {
		var part = parts[i];
		if(part.length > 0) {
			sections.push({ 'key': part, 'value': part });
		}
	}

	// HTTP Get parameters
	var parts = after.split(';');
	var is_first_get_param = true;
	for(var i=0; i<parts.length; ++i) {
		var part = parts[i].split('=');
		if(part.length == 2) {
			var value = '';
			if(is_first_get_param)
				value = '?';
			value += part[0] + '=' + part[1];
			sections.push({ 'key': part[0], 'value': value });
			is_first_get_param = false;
		}
	}

	// Add the breadcrumbs
	var default_sep = "&nbsp;&nbsp;>&nbsp;&nbsp;";
	var tail = '#';
	$('#breadcrumbs_div').empty();
	for(var i=0; i<sections.length; ++i) {
		var section = sections[i];
		var sep = '';
		if(i != sections.length-1)
			sep = default_sep;
		var element = $('<span><a href="' + tail + '/' + section['value'] + '" \>' + section['key'] + '</a>' + sep + '</span>');
		$('#breadcrumbs_div').append(element);
		tail += '/' + section['key'];
	}

	// Show the page. Use Home as default
	var route = location.hash.split('?')[0];
	// Home
	if(route == '#/Home') {
		show_home();
	// All Games with a letter
	} else if(route.match('^#/Home/Games/[a-z|A-Z]$')) {
		var letter = sections[2]['key'].toUpperCase();
		show_library_by_letter(letter, page);
	// All Games with a number
	} else if(route.match('^#/Home/Games/#$')) {
		show_library_by_letter('#', page);
	// Games Page
	} else if(route == '#/Home/Games') {
		show_library_default();
	// Add Games
	} else if(route == '#/Home/Add Games') {
		show_drop();
	// About
	} else if(route == '#/Home/About') {
		show_about();
	// Remove Data
	} else if(route == '#/Home/Remove Data') {
		if(!confirm("Remove all your data?")) {
			location.hash = '#/Home';
			return;
		}

		var games = [];
		Games.for_each({
			each: function(game) {
				games.push(game);
			},
			after: function() {
				for(var i=0; i<games.length; i++) {
					games[i].destroy(function() {
						if(games.length)
							games.length--;
	
						if(games.length == 0)
							alert('Done removing.');
					});
				}
				location.hash = '#/Home';
			}
		});
	// Play game
	} else if(route.indexOf('#/Home/Games/') == 0 && sha256) {
		var game_name = sections[2]['key'];
		var is_done = false;
		Games.for_each_with_name(game_name, {
			each: function(game) {
				if(is_done) return;
	
				if(game.sha256==sha256) {
					show_game_play(game);
					is_done = true;
				}
			},
			after: function() {
				if(!is_done) {
					alert('Unknown game: ' + game_name);
					location.hash = '#/Home';
				}
			}
		});
	// Show game info
	} else if(route.indexOf('#/Home/Games/') == 0) {
		var game_name = sections[2]['key'];
		var is_done = false;
		Games.for_each_with_name(game_name, {
			each: function(game) {
				if(is_done) return;

				show_game_info(game);
				is_done = true;
			},
			after: function() {
				if(!is_done) {
					alert('Unknown game: ' + game_name);
					location.hash = '#/Home';
				}
			}
		});
	// Unknown page
	} else {
		alert('Unknown page: ' + route);
		location.hash = '#/Home';
	}

	if(is_initialized) {
		return;
	}

	// Start getting the gamepad status
	gamepadInterval = setInterval(function() {
		salty_nes.postMessage('get_gamepad_status');
	}, 2000);

	// Setup game drag and drop
	var game_drop = $('#game_drop')[0];
	game_drop.addEventListener("dragenter", handleLibraryDragEnter, true);
	game_drop.addEventListener("dragexit", handleLibraryDragExit, true);
	game_drop.addEventListener("dragover", handleLibraryDragOver, true);
	game_drop.addEventListener("drop", handleLibraryDrop, true);

	// Send all key down events to the NACL app
	$('#bodyId').keydown(handleKeyDown);
	$('#bodyId').keyup(handleKeyUp);
	
	// Pause when the button is clicked
	$('#pause').click(handlePauseClick);

	// Automatically resize the screen to be as big as it can be
	$(window).resize(handleWindowResize);
	
	var debug = $('#debug')[0];
	debug.innerHTML = 'Ready';
	is_initialized = true;
}

$(document).ready(function() {
	// Setup NACL loader
	var bodyId = $('#bodyId')[0];
	bodyId.addEventListener('loadstart', handleNaclLoadStart, true);
	bodyId.addEventListener('loadend', handleNaclLoadEnd, true);
	bodyId.addEventListener('progress', handleNaclProgress, true);
	bodyId.addEventListener('message', handleNaclMessage, true);

	$(window).bind('hashchange', handleHashChange);
});

