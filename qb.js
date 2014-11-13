/*

	QB - Tiny library to deal with SVG

	Author: Otto Nascarella
	Licence: MIT

*/

(function(window, undefined) {
'use strict';

/*
	TOOLS AND HELPERS
*/

var ns = {
	svg: 'http://www.w3.org/2000/svg',
	xlink: 'http://www.w3.org/1999/xlink'
};

function makeEl(name) {
	return document.createElementNS(ns.svg, name);
}

function extend(destination, mixin) {
	for (var k in mixin) {
		if (!mixin.hasOwnProperty(k)) continue;
		destination[k] = mixin[k];
	}
}

function camelCased(str) {
	return str.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
}

function dashCased(str) {
	return str.replace(/([a-z][A-Z])/g,	function (g) { return g[0] + '-' + g[1].toLowerCase(); });
}

var nodeID = (function(){

	var cache = {};

	function makeID() {
		var id = Math.random().toString(36).slice(-8);

		if (cache[id]) {
			return makeID();
		}

		cache[id] = true;

		return id;
	}


	return function(node) {
		var id = node.id;

		if (!id) {
			node.id = id = makeID();
		}

		return id;
	};

}());



function makeRegEx(str) {
	return new RegExp('(\\s|^)' + str +'(\\s|$)', 'g');
}

/*
	Qb array-like
*/

function Qb(ar) {
	if (ar === undefined || ar === null || ar.length === 0) ar = [];
	else if (ar.length === undefined) ar = [ar];

	if (ar.length) {

		for (var i = 0, l = ar.length; i < l; i++) {
			this[i] = ar[i];
		}

	}

	this.length = ar.length;
}

Qb.prototype = {
	slice: Array.prototype.slice,
	push: Array.prototype.push,
	each: Array.prototype.forEach,
	map: Array.prototype.map,
	filter: Array.prototype.filter,
	reverse: Array.prototype.reverse,
	sort: Array.prototype.sort,
	attr: function(opts) {

		if (typeof opts === 'string') return this[0].getAttribute(opts);

		this.each(function(node) {

			for (var k in opts) {
				var dashed = dashCased(k);

				if (!opts.hasOwnProperty(dashed)) continue;

				if ( (/href/).test(dashed) )
					node.setAttributeNS(ns.xlink, dashed, opts[k]);
				else
					node.setAttribute(dashed, opts[k]);

			}

		});

		return this;

	},
	css: function(opts) {

		if (typeof opts === 'string') return window.getComputedStyle(this[0])[opts];

		this.each(function(node) {

			for (var k in opts) {
				if (!opts.hasOwnProperty(k)) continue;
				node.style[k] = opts[k];
			}

		});

		return this;

	},

	get: function(n) {

		var el = (n < 0) ? this[this.length + n] : this[n];
		return qb.new(el);

	},

	query: function(query) {
		return qb( this[0].querySelector(query) );
	},

	getByName: function(query) {
		return qb( this[0].getElementsByTagNameNS(ns.svg, query) );
	},

	queryAll: function(query) {
		return qb( this[0].querySelectorAll(query) );
	},

	parent: function() {
		return qb(this[0].parentNode);
	},

	children: function() {
		return qb(this[0].children);
	},
	clone: function(deep) {
		var el = this[0].cloneNode(deep);

		return qb(el);
	},
	append: function(children) {
		var that = this;

		if (children instanceof Qb) {

			children.each(function(child) {
				that[0].appendChild(child);
			});

			return this;
		}

		if (children instanceof SVGElement) {
			this[0].appendChild(children);
		}

		return this;
	},

	prepend: function(children) {
		var b = this.query(':first-child');


		if (!(b[0] instanceof SVGElement)) {

			this.append(children);
			return this;
		}

		b = b[0];

		if (children instanceof SVGElement) {
			this[0].insertBefore(b, children);
			return this;
		}

		if (children instanceof Qb) {
			children.each(function(child) {
				this[0].insertBefore(b, child);
			});
		}

		return this;
	},

	appendTo: function(parent) {

		if (typeof parent === 'string') parent = qb(parent);
		else if (parent instanceof SVGElement || parent instanceof HTMLElement) parent = qb(parent);

		if (parent instanceof Qb) parent.append(this);
		else throw Error('could not find parentNode.');

		return this;
	},

	remove:function() {

		this.each(function(el) {
			el.parentNode.removeChild(el);
		});

	},

    empty: function() {

		this.each(function(el) {
			var els = el.querySelectorAll('*');

			for (var i = 0, l = els.length; i < l; i++) {
				els[i].parentNode.removeChild(els[i]);
			}

			el.textContent = '';

		});

		return this;
    },

	new: function(str, opts) {
		var el = new Qb( makeEl(str) );

		if (opts) el.attr(opts);

		this[0].appendChild(el[0]);

		return el;
	},

	use: function() {

		var id = nodeID(this[0]);

		return qb.new('use', {href: '#' + id});

	},

	text: function(string) {
		if (!string) return this[0].textContent;

		this.each(function(el) {
			if (typeof el.textContent === 'string') el.textContent = string;
		});

		return this;
	},

    onPath: function(path) {
    	var string, id;

		if (!(this[0] instanceof SVGTextElement))
			throw Error('onPath needs to be called on a <text>.');

		if (path instanceof Qb)
			path = path[0];

		if (!(path instanceof SVGPathElement))
			throw Error('onPath needs to be called with a <path> as argument.');

		string = this.text();
		id = nodeID(path);

		this.empty();

		this.new('textPath').text(string).attr({href: '#' + id});

		return this;
    },

    offPath: function() {
    	var string, textPath;

    	textPath = this.getByName('textPath');

		if (textPath.length === 0) return this;

		string = textPath.text();

		this.empty();

		this[0].textContent = string;

		return this;
    },

	toggleClass: function (className) {
		className = className.split(/\s/g);

		this.each(function(el) {
			var $el = qb(el);

			className.forEach(function(c) {
			    if ($el.hasClass(c)) {
			        $el.removeClass(c);
			    } else {
			        $el.addClass(c);
			    }
			});

		});

		return this;
	},
	constructor: Qb,
};

/*
	Qb conditional extension
*/

var testEl = makeEl('text');

/*
	new Chrome and Firefox have classList for SVG.
	IE11 does not....

*/
if (testEl.classList && testEl.classList.add) {

	extend(Qb.prototype, {

		hasClass: function (className) {
			var el = this[0];
			if (typeof className !== 'string') className = String(className);

	    	className = className.split(/\s/g);

	    	for(var i = 0, l = className.length; i < l; i++) {
	    		if (!el.classList.contains( className[i] )) return false;
	    	}

			return true;
		},

	    addClass :  function (classNames) {

	    	classNames = classNames.split(/\s/g);

	    	this.each(function(el) {

		    	classNames.forEach(function(c) {
		    		el.classList.add(c);
		    	});

	    	});

	        return this;
	    },
	    removeClass: function (classNames) {
		    classNames = classNames.split(/\s/g);

	    	this.each(function(el) {

		    	classNames.forEach(function(c) {
		    		el.classList.remove(c);
		    	});

	    	});


	        return this;
	    }

	});

} else {

	extend(Qb.prototype, {
		hasClass: function (className) {
			var el = this[0];
			if (typeof className !== 'string') className = String(className);

			className = className.split(/\s/g);

	    	for(var i = 0, l = className.length; i < l; i++) {
				if ( !makeRegEx( className[i] ).test(el.className.baseVal) ) return false;
			}

			return true;

		},
	    addClass :  function (classNames) {

	    	classNames = classNames.split(/\s/g);

	    	this.each(function(el) {
		    	var newClass = el.className.baseVal;


		    	classNames.forEach(function(c) {
			        if (makeRegEx(c).test(newClass)) return;
		            newClass += (' ' + c);
		    	});

		    	el.className.baseVal = newClass.trim();
	    	});


	        return this;
	    },
	    removeClass : function (classNames) {

		    classNames = classNames.split(/\s/g);

	    	this.each(function(el) {

		    	var newClass = el.className.baseVal;

		    	classNames.forEach(function(c) {

			        if (makeRegEx(c).test(newClass)) {
			      	 	newClass = newClass.replace( makeRegEx(c) ,'$2');
			        }

		    	});

		        el.className.baseVal = newClass.trim();

	    	});


	        return this;
	    }

	});

}


function qb(query) {

	if (query instanceof SVGElement)
		return new Qb(query);

	else if (typeof query.length === "number" && typeof query !== 'string')
		return new Qb(query);

	return new Qb( document.querySelectorAll(query) );
}

qb.new = function(name, opts) {
	var el;


	el = new Qb(makeEl(name));

	if (opts) el.attr(opts);

	return el;
};

qb.plugin = function(pluginFactory) {
	pluginFactory(Qb);
};

window.qb = qb;

}(window));