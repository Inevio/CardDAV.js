
// Modules
var _      = require('lodash');
var http   = require('http');
var https  = require('https');
var moment = require('moment');
var xml2js = require('xml2js');
var uuid   = require('node-uuid');
var vCard  = require('vcards-js')();
_.mixin(require("lodash-deep"));

// Variables
var parseOptions = {
	explicitRoot : false,
	normalizeTags : true,
	tagNameProcessors : [xml2js.processors.stripPrefix],
	//explicitArray : false
};

// Functions
var escapeString = function( str ){
  return ( str || '' ).toString().replace( ';' , '\\;' ).replace( ',' , '\\,' );
};

var escapeStringWithLines = function( str ){
  return ( str || '' ).toString().replace( '\n' , '\\n' ).replace( ';' , '\\;' ).replace( ',' , '\\,' );
};

var telFamily = function( type ){

  type = ( type || '' ).toString().toLowerCase();

  switch( type ){
    case 'cell': return 'type=CELL;type=VOICE'; break;
    case 'iphone': return 'type=IPHONE;type=CELL;type=VOICE'; break;
    case 'home': return 'type=HOME;type=VOICE'; break;
    case 'work': return 'type=WORK;type=VOICE'; break;
    case 'main': return 'type=MAIN'; break;
    case 'homefax': return 'type=HOME;type=FAX'; break;
    case 'workfax': return 'ttype=WORK;type=FAX'; break;
    case 'otherfax': return 'type=OTHER;type=FAX'; break;
    case 'pager': return 'type=PAGER'; break;
    default: return 'type=OTHER;type=VOICE'; break;

  }

};

var emailFamily = function( type ){

  type = ( type || '' ).toString().toLowerCase();

  switch( type ){
    case 'home': return 'type=INTERNET;type=HOME'; break;
    case 'work': return 'type=INTERNET;type=WORK'; break;
    default: return 'type=INTERNET'; break;

  }

};

var urlFamily = function( type ){

  type = ( type || '' ).toString().toLowerCase();

  switch( type ){
    case 'home': return ';type=HOME'; break;
    case 'work': return ';type=WORK'; break;
    default: return ''; break;

  }

};

var adrFamily = function( type ){

  type = ( type || '' ).toString().toLowerCase();

  switch( type ){
    case 'home': return 'type=HOME'; break;
    case 'work': return 'type=WORK'; break;
    default: return 'type=OTHER'; break;

  }

};

var vcardTelFamily = function( type ){

	type = ( type || '' ).toString().toLowerCase();

	if( type.indexOf('iphone') !== -1 ){
		return 'iphone';
	}else if( type.indexOf('cell') !== -1 ){
		return 'cell';
	}else if( type.indexOf('home') !== -1 && type.indexOf('fax') !== -1 ){
		return 'homefax';
	}else if( type.indexOf('work') !== -1 && type.indexOf('fax') !== -1 ){
		return 'workfax';
	}else if( type.indexOf('other') !== -1 && type.indexOf('fax') !== -1 ){
		return 'otherfax';
	}else if( type.indexOf('fax') !== -1 ){
		return 'workfax';
	}else if( type.indexOf('main') !== -1 ){
		return 'main';
	}else if( type.indexOf('work') !== -1 ){
		return 'work';
	}else if( type.indexOf('home') !== -1 ){
		return 'home';
	}else if( type.indexOf('pager') !== -1 ){
		return 'pager';
	}else{
		return 'other';
	}

};

var vcardEmailFamily = function( type ){

	type = ( type || '' ).toString().toLowerCase();

	if( type.indexOf('work') !== -1 ){
		return 'work';
	}else if( type.indexOf('home') !== -1 ){
		return 'home';
	}else{
		return 'other';
	}

};

var vcardAdrFamily = function( type ){

	type = ( type || '' ).toString().toLowerCase();

	if( type.indexOf('work') !== -1 ){
		return 'work';
	}else if( type.indexOf('home') !== -1 ){
		return 'home';
	}else{
		return 'other';
	}

};

var vcardUrlFamily = function( type ){

	type = ( type || '' ).toString().toLowerCase();

	if( type.indexOf('work') !== -1 ){
		return 'work';
	}else if( type.indexOf('home') !== -1 ){
		return 'home';
	}else{
		return 'other';
	}

};

// Export module
module.exports = {

	request : function( opts, secure, callback ){

		var protocol = secure ? https : http;

		var req = protocol.request( opts, function( res ){

			var buffer = '';

			res.on( 'data', function( data ){
				buffer += data;
			});

			res.on( 'end', function( data ){

				res.body = buffer;

				callback( null, res );

			});

		}).on( 'error', function( err ){
			console.log(err);
		});

		req.write( opts.data );
		req.end();
	},

	parseXML : function( xmlString, callback ){
		xml2js.parseString(xmlString, parseOptions,callback);
	},

	cloneObject : function( obj ){
		return JSON.parse( JSON.stringify( obj ) );
	},

	uuid : function (string) {
		return uuid.v4();
	},

	normalizeAddressbookAttribute : function( result, value, key ){

		if(!value || !value[0] || !value[0] === 'undefined'){
			return result;
		}

		value = value[0];

		switch( key ){

			case 'resourcetype':
				value = Object.keys( value );
				break;

			case 'getctag':
				value = value.replace(/^"(.+(?="$))"$/, '$1');
				break;

		}

		result[key] = value;
		return result;

	},

	jsonToVCard : function( data ){

		var list = [];

		list.push('BEGIN:VCARD');
		list.push('VERSION:3.0');
		list.push(
			'N:' +
			escapeString( data.name.last ) + ';' +
			escapeString( data.name.first ) + ';' +
			escapeString( data.name.middle ) + ';' +
			escapeString( data.name.prefix ) + ';' +
			escapeString( data.name.suffix )
		);

		list.push(
			'FN:' +
			( data.name.prefix ? escapeString( data.name.prefix ) + ' ' : '' ) +
			( data.name.first ? escapeString( data.name.first ) + ' ' : '' ) +
			( data.name.middle ? escapeString( data.name.middle ) + ' ' : '' ) +
			( data.name.last ? escapeString( data.name.last ) + ' ' : '' ) +
			( data.name.suffix ? escapeString( data.name.suffix ) + ' ' : '' )
		);

		if( data.nickname ){
			list.push( 'NICKNAME:' + escapeString( data.nickname ) );
		}

		if( data.org ){

			list.push(
				'ORG:' +
				escapeString( data.org.company ) + ';' +
				escapeString( data.org.department )
			);

		}

		if( data.title ){
			list.push( 'TITLE:' + escapeString( data.title ) );
		}

		if( data.phone && data.phone instanceof Array ){

			for( var i = 0; i < data.phone.length; i++ ){
				list.push( 'TEL;' + telFamily( data.phone[ i ].type ) + ':' + escapeString( data.phone[ i ].value ) );
			}

		}

		if( data.email && data.email instanceof Array ){

			for( var i = 0; i < data.email.length; i++ ){
				list.push( 'EMAIL;' + emailFamily( data.email[ i ].type ) + ':' + escapeString( data.email[ i ].value ) );
			}

		}

		if( data.address && data.address instanceof Array ){

			for( var i = 0; i < data.address.length; i++ ){

				list.push(
					'ADR;' +
					adrFamily( data.address[ i ].type ) + ':' +
					';;' +
					escapeString( data.address[ i ].street ) + ';' +
					escapeString( data.address[ i ].city ) + ';' +
					escapeString( data.address[ i ].region ) + ';' +
					escapeString( data.address[ i ].code ) + ';' +
					escapeString( data.address[ i ].country )
				);

			}

		}

		if( data.url && data.url instanceof Array ){

			for( var i = 0; i < data.url.length; i++ ){
				list.push( 'URL' + urlFamily( data.url[ i ].type ) + ':' + escapeString( data.url[ i ].value ) );
			}

		}

		if( data.birthday ){
			list.push( 'BDAY:' + data.birthday.year + '-' + ( '0' + data.birthday.month ).slice(-2) + '-' + ( '0' + data.birthday.day ).slice(-2) );
		}

		if( data.note ){
			list.push( 'NOTE:' + escapeStringWithLines( data.note ) );
		}

		list.push( 'REV:' + moment().format() );

		list.push('END:VCARD');

		return new Buffer( list.join('\r\n') );

	},

	VCardToJson : function( data ){

		var res = {

			name : {
				last   : data.n.last || '',
				first  : data.n.first || '',
				middle : data.n.middle || '',
				prefix : data.n.prefix || '',
				suffix : data.n.suffix || ''
			},

			org : {
				company    : data.org ? data.org.name || '' : '',
				department : data.org ? data.org.dept || '' : ''
			},

			title    : data.title || '',
			nickname : data.nickname || '',
			phone    : [],
			email    : [],
			address  : [],
			url      : [],
			birthday : {}

		};

		if( data.tel && data.tel.length ){

			data.tel.forEach( function( tel ){
				res.phone.push({ type : vcardTelFamily( tel.type[ 0 ] ), value : tel.value });
			});

		}

		if( data.email && data.email.length ){

			data.email.forEach( function( email ){
				res.email.push({ type : vcardEmailFamily( email.type[ 0 ] ), value : email.value });
			});

		}

		if( data.adr && data.adr.length ){

			data.adr.forEach( function( adr ){

				res.address.push({

					type    : vcardAdrFamily( adr.type[ 0 ] ),
					street  : adr.value.street || '',
					city    : adr.value.city || '',
					region  : adr.value.region || '',
					code    : adr.value.zip || '',
					country : adr.value.country || ''

				});

			});

		}

		if( data.url && data.url.length ){

			data.url.forEach( function( url ){
				res.url.push({ type : vcardUrlFamily( url.type[ 0 ] ), value : url.value });
			});

		}

		if( data.bday ){

			res.birthday = data.bday.split('-');
			res.birthday = {

				year : res.birthday[ 0 ] ,
				month : ( '0' + res.birthday[ 1 ] ).slice(-2),
				day : ( '0' + res.birthday[ 2 ] ).slice(-2)

			};

		}

		return res;

	}

};
