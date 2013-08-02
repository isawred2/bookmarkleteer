var global = Function("return this;")();
/*!
  * Ender: open module JavaScript framework (client-lib)
  * copyright Dustin Diaz & Jacob Thornton 2011 (@ded @fat)
  * http://ender.no.de
  * License MIT
  */
!function (context) {

  // a global object for node.js module compatiblity
  // ============================================

  context['global'] = context

  // Implements simple module system
  // losely based on CommonJS Modules spec v1.1.1
  // ============================================

  var modules = {}
    , old = context.$

  function require (identifier) {
    // modules can be required from ender's build system, or found on the window
    var module = modules[identifier] || window[identifier]
    if (!module) throw new Error("Requested module '" + identifier + "' has not been defined.")
    return module
  }

  function provide (name, what) {
    return (modules[name] = what)
  }

  context['provide'] = provide
  context['require'] = require

  function aug(o, o2) {
    for (var k in o2) k != 'noConflict' && k != '_VERSION' && (o[k] = o2[k])
    return o
  }

  function boosh(s, r, els) {
    // string || node || nodelist || window
    if (typeof s == 'string' || s.nodeName || (s.length && 'item' in s) || s == window) {
      els = ender._select(s, r)
      els.selector = s
    } else els = isFinite(s.length) ? s : [s]
    return aug(els, boosh)
  }

  function ender(s, r) {
    return boosh(s, r)
  }

  aug(ender, {
      _VERSION: '0.3.6'
    , fn: boosh // for easy compat to jQuery plugins
    , ender: function (o, chain) {
        aug(chain ? boosh : ender, o)
      }
    , _select: function (s, r) {
        return (r || document).querySelectorAll(s)
      }
  })

  aug(boosh, {
    forEach: function (fn, scope, i) {
      // opt out of native forEach so we can intentionally call our own scope
      // defaulting to the current item and be able to return self
      for (i = 0, l = this.length; i < l; ++i) i in this && fn.call(scope || this[i], this[i], i, this)
      // return self for chaining
      return this
    },
    $: ender // handy reference to self
  })

  ender.noConflict = function () {
    context.$ = old
    return this
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = ender
  // use subscript notation as extern for Closure compilation
  context['ender'] = context['$'] = context['ender'] || ender

}(this);
// pakmanager:pure
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /*!
    	PURE Unobtrusive Rendering Engine for HTML
    
    	Licensed under the MIT licenses.
    	More information at: http://www.opensource.org
    
    	Copyright (c) 2011 Michael Cvilic - BeeBole.com
    
    	Thanks to Rog Peppe for the functional JS jump
    	revision: 2.67
    */
    
    var $p, pure = $p = function(){
    	var sel = arguments[0], 
    		ctxt = false;
    
    	if(typeof sel === 'string'){
    		ctxt = arguments[1] || false;
    	}else if(sel && !sel[0] && !sel.length){
    		sel = [sel];
    	}
    	return $p.core(sel, ctxt);
    };
    
    $p.core = function(sel, ctxt, plugins){
    	//get an instance of the plugins
    	var templates = [];
    	plugins = plugins || getPlugins();
    
    	//search for the template node(s)
    	switch(typeof sel){
    		case 'string':
    			templates = plugins.find(ctxt || document, sel);
    			if(templates.length === 0) {
    				error('The template "' + sel + '" was not found');
    			}
    		break;
    		case 'undefined':
    			error('The root of the template is undefined, check your selector');
    		break;
    		default:
    			templates = sel;
    	}
    	
    	for(var i = 0, ii = templates.length; i < ii; i++){
    		plugins[i] = templates[i];
    	}
    	plugins.length = ii;
    
    	// set the signature string that will be replaced at render time
    	var Sig = '_s' + Math.floor( Math.random() * 1000000 ) + '_',
    		// another signature to prepend to attributes and avoid checks: style, height, on[events]...
    		attPfx = '_a' + Math.floor( Math.random() * 1000000 ) + '_',
    		// rx to parse selectors, e.g. "+tr.foo[class]"
    		selRx = /^(\+)?([^\@\+]+)?\@?([^\+]+)?(\+)?$/,
    		// set automatically attributes for some tags
    		autoAttr = {
    			IMG:'src',
    			INPUT:'value'
    		},
    		// check if the argument is an array - thanks salty-horse (Ori Avtalion)
    		isArray = Array.isArray ?
    			function(o) {
    				return Array.isArray(o);
    			} :
    			function(o) {
    				return Object.prototype.toString.call(o) === "[object Array]";
    			};
    	
    	/* * * * * * * * * * * * * * * * * * * * * * * * * *
    		core functions
    	 * * * * * * * * * * * * * * * * * * * * * * * * * */
    
    
    	// error utility
    	function error(e){
    		if(typeof console !== 'undefined'){
    			console.log(e);
    			debugger;
    		}
    		throw('pure error: ' + e);
    	}
    	
    	//return a new instance of plugins
    	function getPlugins(){
    		var plugins = $p.plugins,
    			f = function(){};
    		f.prototype = plugins;
    
    		// do not overwrite functions if external definition
    		f.prototype.compile    = plugins.compile || compile;
    		f.prototype.render     = plugins.render || render;
    		f.prototype.autoRender = plugins.autoRender || autoRender;
    		f.prototype.find       = plugins.find || find;
    		
    		// give the compiler and the error handling to the plugin context
    		f.prototype._compiler  = compiler;
    		f.prototype._error     = error;
     
    		return new f();
    	}
    	
    	// returns the outer HTML of a node
    	function outerHTML(node){
    		// if IE, Chrome take the internal method otherwise build one
    		return node.outerHTML || (
    			function(n){
            		var div = document.createElement('div'), h;
    	        	div.appendChild( n.cloneNode(true) );
    				h = div.innerHTML;
    				div = null;
    				return h;
    			})(node);
    	}
    	
    	// returns the string generator function
    	function wrapquote(qfn, f){
    		return function(ctxt){
    			return qfn('' + f.call(ctxt.context, ctxt));
    		};
    	}
    
    	// default find using querySelector when available on the browser
    	function find(n, sel){
    		if(typeof n === 'string'){
    			sel = n;
    			n = false;
    		}
    		if(typeof document.querySelectorAll !== 'undefined'){
    			return (n||document).querySelectorAll( sel );
    		}else{
    			return error('You can test PURE standalone with: iPhone, FF3.5+, Safari4+ and IE8+\n\nTo run PURE on your browser, you need a JS library/framework with a CSS selector engine');
    		}
    	}
    	
    	// create a function that concatenates constant string
    	// sections (given in parts) and the results of called
    	// functions to fill in the gaps between parts (fns).
    	// fns[n] fills in the gap between parts[n-1] and parts[n];
    	// fns[0] is unused.
    	// this is the inner template evaluation loop.
    	function concatenator(parts, fns){
    		return function(ctxt){
    			var strs = [ parts[ 0 ] ],
    				n = parts.length,
    				fnVal, pVal, attLine, pos;
    
    			for(var i = 1; i < n; i++){
    				fnVal = fns[i].call( this, ctxt );
    				pVal = parts[i];
    				
    				// if the value is empty and attribute, remove it
    				if(fnVal === ''){
    					attLine = strs[ strs.length - 1 ];
    					if( ( pos = attLine.search( /[^\s]+=\"?$/ ) ) > -1){
    						strs[ strs.length - 1 ] = attLine.substring( 0, pos );
    						pVal = pVal.substr( 1 );
    					}
    				}
    				
    				strs[ strs.length ] = fnVal;
    				strs[ strs.length ] = pVal;
    			}
    			return strs.join('');
    		};
    	}
    
    	// parse and check the loop directive
    	function parseloopspec(p){
    		var m = p.match( /^(\w+)\s*<-\s*(\S+)?$/ );
    		if(m === null){
    			error('bad loop spec: "' + p + '"');
    		}
    		if(m[1] === 'item'){
    			error('"item<-..." is a reserved word for the current running iteration.\n\nPlease choose another name for your loop.');
    		}
    		if( !m[2] || (m[2] && (/context/i).test(m[2]))){ //undefined or space(IE) 
    			m[2] = function(ctxt){return ctxt.context;};
    		}
    		return {name: m[1], sel: m[2]};
    	}
    
    	// parse a data selector and return a function that
    	// can traverse the data accordingly, given a context.
    	function dataselectfn(sel){
    		if(typeof(sel) === 'function'){
    			return sel;
    		}
    		//check for a valid js variable name with hyphen(for properties only), $, _ and :
    		var m = sel.match(/^[a-zA-Z\$_\@][\w\$:-]*(\.[\w\$:-]*[^\.])*$/);
    		if(m === null){
    			var found = false, s = sel, parts = [], pfns = [], i = 0, retStr;
    			// check if literal
    			if(/\'|\"/.test( s.charAt(0) )){
    				if(/\'|\"/.test( s.charAt(s.length-1) )){
    					retStr = s.substring(1, s.length-1);
    					return function(){ return retStr; };
    				}
    			}else{
    				// check if literal + #{var}
    				while((m = s.match(/#\{([^{}]+)\}/)) !== null){
    					found = true;
    					parts[i++] = s.slice(0, m.index);
    					pfns[i] = dataselectfn(m[1]);
    					s = s.slice(m.index + m[0].length, s.length);
    				}
    			}
    			if(!found){
    				return function(){ return sel; };
    			}
    			parts[i] = s;
    			return concatenator(parts, pfns);
    		}
    		m = sel.split('.');
    		return function(ctxt){
    			var data = ctxt.context || ctxt,
    				v = ctxt[m[0]],
    				i = 0;
    			if(v && v.item){
    				i += 1;
    				if(m[i] === 'pos'){
    					//allow pos to be kept by string. Tx to Adam Freidin
    					return v.pos;
    				}else{
    					data = v.item;
    				}
    			}
    			var n = m.length;
    			for(; i < n; i++){
    				if(!data){break;}
    				data = data[m[i]];
    			}
    			return (!data && data !== 0) ? '':data;
    		};
    	}
    
    	// wrap in an object the target node/attr and their properties
    	function gettarget(dom, sel, isloop){
    		var osel, prepend, selector, attr, append, target = [];
    		if( typeof sel === 'string' ){
    			osel = sel;
    			var m = sel.match(selRx);
    			if( !m ){
    				error( 'bad selector syntax: ' + sel );
    			}
    			
    			prepend = m[1];
    			selector = m[2];
    			attr = m[3];
    			append = m[4];
    			
    			if(selector === '.' || ( !selector && attr ) ){
    				target[0] = dom;
    			}else{
    				target = plugins.find(dom, selector);
    			}
    			if(!target || target.length === 0){
    				return error('The node "' + sel + '" was not found in the template:\n' + outerHTML(dom).replace(/\t/g,'  '));
    			}
    		}else{
    			// autoRender node
    			prepend = sel.prepend;
    			attr = sel.attr;
    			append = sel.append;
    			target = [dom];
    		}
    		
    		if( prepend || append ){
    			if( prepend && append ){
    				error('append/prepend cannot take place at the same time');
    			}else if( isloop ){
    				error('no append/prepend/replace modifiers allowed for loop target');
    			}else if( append && isloop ){
    				error('cannot append with loop (sel: ' + osel + ')');
    			}
    		}
    		var setstr, getstr, quotefn, isStyle, isClass, attName, setfn;
    		if(attr){
    			isStyle = (/^style$/i).test(attr);
    			isClass = (/^class$/i).test(attr);
    			attName = isClass ? 'className' : attr;
    			setstr = function(node, s) {
    				node.setAttribute(attPfx + attr, s);
    				if (attName in node && !isStyle) {
    					node[attName] = '';
    				}
    				if (node.nodeType === 1) {
    					node.removeAttribute(attr);
    					isClass && node.removeAttribute(attName);
    				}
    			};
    			if (isStyle || isClass) {//IE no quotes special care
    				if(isStyle){
    					getstr = function(n){ return n.style.cssText; };
    				}else{
    					getstr = function(n){ return n.className;	};
    				}
    			}else {
    				getstr = function(n){ return n.getAttribute(attr); };
    			}
    			quotefn = function(s){ return s.replace(/\"/g, '&quot;'); };
    			if(prepend){
    				setfn = function(node, s){ setstr( node, s + getstr( node )); };
    			}else if(append){
    				setfn = function(node, s){ setstr( node, getstr( node ) + s); };
    			}else{
    				setfn = function(node, s){ setstr( node, s ); };
    			}
    		}else{
    			if (isloop) {
    				setfn = function(node, s) {
    					var pn = node.parentNode;
    					if (pn) {
    						//replace node with s
    						pn.insertBefore(document.createTextNode(s), node.nextSibling);
    						pn.removeChild(node);
    					}
    				};
    			} else {
    				if (prepend) {
    					setfn = function(node, s) { node.insertBefore(document.createTextNode(s), node.firstChild);	};
    				} else if (append) {
    					setfn = function(node, s) { node.appendChild(document.createTextNode(s));};
    				} else {
    					setfn = function(node, s) {
    						while (node.firstChild) { node.removeChild(node.firstChild); }
    						node.appendChild(document.createTextNode(s));
    					};
    				}
    			}
    			quotefn = function(s) { return s; };
    		}
    		return { attr: attr, nodes: target, set: setfn, sel: osel, quotefn: quotefn };
    	}
    
    	function setsig(target, n){
    		var sig = Sig + n + ':';
    		for(var i = 0; i < target.nodes.length; i++){
    			// could check for overlapping targets here.
    			target.set( target.nodes[i], sig );
    		}
    	}
    
    	// read de loop data, and pass it to the inner rendering function
    	function loopfn(name, dselect, inner, sorter, filter){
    		return function(ctxt){
    			var a = dselect(ctxt),
    				old = ctxt[name],
    				temp = { items : a },
    				filtered = 0,
    				length,
    				strs = [],
    				buildArg = function(idx, temp, ftr, len){
    					//keep the current loop. Tx to Adam Freidin
    					var save_pos = ctxt.pos,
    						save_item = ctxt.item,
    						save_items = ctxt.items;
    					ctxt.pos = temp.pos = idx;
    					ctxt.item = temp.item = a[ idx ];
    					ctxt.items = a;
    					//if array, set a length property - filtered items
    					typeof len !== 'undefined' &&  (ctxt.length = len);
    					//if filter directive
    					if(typeof ftr === 'function' && ftr.call(ctxt.item, ctxt) === false){
    						filtered++;
    						return;
    					}
    					strs.push( inner.call(ctxt.item, ctxt ) );
    					//restore the current loop
    					ctxt.pos = save_pos;
    					ctxt.item = save_item;
    					ctxt.items = save_items;
    				};
    			ctxt[name] = temp;
    			if( isArray(a) ){
    				length = a.length || 0;
    				// if sort directive
    				if(typeof sorter === 'function'){
    					a.sort(sorter);
    				}
    				//loop on array
    				for(var i = 0, ii = length; i < ii; i++){
    					buildArg(i, temp, filter, length - filtered);
    				}
    			}else{
    				if(a && typeof sorter !== 'undefined'){
    					error('sort is only available on arrays, not objects');
    				}
    				//loop on collections
    				for(var prop in a){
    					a.hasOwnProperty( prop ) && buildArg(prop, temp, filter);
    				}
    			}
    
    			typeof old !== 'undefined' ? ctxt[name] = old : delete ctxt[name];
    			return strs.join('');
    		};
    	}
    	// generate the template for a loop node
    	function loopgen(dom, sel, loop, fns){
    		var already = false, ls, sorter, filter, prop;
    		for(prop in loop){
    			if(loop.hasOwnProperty(prop)){
    				if(prop === 'sort'){
    					sorter = loop.sort;
    					continue;
    				}else if(prop === 'filter'){
    					filter = loop.filter;
    					continue;
    				}
    				if(already){
    					error('cannot have more than one loop on a target');
    				}
    				ls = prop;
    				already = true;
    			}
    		}
    		if(!ls){
    			error('Error in the selector: ' + sel + '\nA directive action must be a string, a function or a loop(<-)');
    		}
    		var dsel = loop[ls];
    		// if it's a simple data selector then we default to contents, not replacement.
    		if(typeof(dsel) === 'string' || typeof(dsel) === 'function'){
    			loop = {};
    			loop[ls] = {root: dsel};
    			return loopgen(dom, sel, loop, fns);
    		}
    		var spec = parseloopspec(ls),
    			itersel = dataselectfn(spec.sel),
    			target = gettarget(dom, sel, true),
    			nodes = target.nodes;
    			
    		for(i = 0; i < nodes.length; i++){
    			var node = nodes[i],
    				inner = compiler(node, dsel);
    			fns[fns.length] = wrapquote(target.quotefn, loopfn(spec.name, itersel, inner, sorter, filter));
    			target.nodes = [node];		// N.B. side effect on target.
    			setsig(target, fns.length - 1);
    		}
    		return target;
    	}
    	
    	function getAutoNodes(n, data){
    		var ns = n.getElementsByTagName('*'),
    			an = [],
    			openLoops = {a:[],l:{}},
    			cspec,
    			isNodeValue,
    			i, ii, j, jj, ni, cs, cj;
    		//for each node found in the template
    		for(i = -1, ii = ns.length; i < ii; i++){
    			ni = i > -1 ?ns[i]:n;
    			if(ni.nodeType === 1 && ni.className !== ''){
    				//when a className is found
    				cs = ni.className.split(' ');
    				// for each className 
    				for(j = 0, jj=cs.length;j<jj;j++){
    					cj = cs[j];
    					// check if it is related to a context property
    					cspec = checkClass(cj, ni.tagName);
    					// if so, store the node, plus the type of data
    					if(cspec !== false){
    						isNodeValue = (/nodevalue/i).test(cspec.attr);
    						if(cspec.sel.indexOf('@') > -1 || isNodeValue){
    							ni.className = ni.className.replace('@'+cspec.attr, '');
    							if(isNodeValue){
    								cspec.attr = false;
    							} 
    						}
    						an.push({n:ni, cspec:cspec});
    					}
    				}
    			}
    		}
    		
    		function checkClass(c, tagName){
    			// read the class
    			var ca = c.match(selRx),
    				attr = ca[3] || autoAttr[tagName],
    				cspec = {prepend:!!ca[1], prop:ca[2], attr:attr, append:!!ca[4], sel:c},
    				i, ii, loopi, loopil, val;
    			// check in existing open loops
    			for(i = openLoops.a.length-1; i >= 0; i--){
    				loopi = openLoops.a[i];
    				loopil = loopi.l[0];
    				val = loopil && loopil[cspec.prop];
    				if(typeof val !== 'undefined'){
    					cspec.prop = loopi.p + '.' + cspec.prop;
    					if(openLoops.l[cspec.prop] === true){
    						val = val[0];
    					}
    					break;
    				}
    			}
    			// not found check first level of data
    			if(typeof val === 'undefined'){
    				val = dataselectfn(cspec.prop)(isArray(data) ? data[0] : data);
    				// nothing found return
    				if(val === ''){
    					return false;
    				}
    			}
    			// set the spec for autoNode
    			if(isArray(val)){
    				openLoops.a.push( {l:val, p:cspec.prop} );
    				openLoops.l[cspec.prop] = true;
    				cspec.t = 'loop';
    			}else{
    				cspec.t = 'str';
    			}
    			return cspec;
    		}
    
    		return an;
    
    	}
    
    	// returns a function that, given a context argument,
    	// will render the template defined by dom and directive.
    	function compiler(dom, directive, data, ans){
    		var fns = [], j, jj, cspec, n, target, nodes, itersel, node, inner, dsel, sels, sel, sl, i, h, parts,  pfns = [], p;
    		// autoRendering nodes parsing -> auto-nodes
    		ans = ans || data && getAutoNodes(dom, data);
    		if(data){
    			// for each auto-nodes
    			while(ans.length > 0){
    				cspec = ans[0].cspec;
    				n = ans[0].n;
    				ans.splice(0, 1);
    				if(cspec.t === 'str'){
    					// if the target is a value
    					target = gettarget(n, cspec, false);
    					setsig(target, fns.length);
    					fns[fns.length] = wrapquote(target.quotefn, dataselectfn(cspec.prop));
    				}else{
    					// if the target is a loop
    					itersel = dataselectfn(cspec.sel);
    					target = gettarget(n, cspec, true);
    					nodes = target.nodes;
    					for(j = 0, jj = nodes.length; j < jj; j++){
    						node = nodes[j];
    						inner = compiler(node, false, data, ans);
    						fns[fns.length] = wrapquote(target.quotefn, loopfn(cspec.sel, itersel, inner));
    						target.nodes = [node];
    						setsig(target, fns.length - 1);
    					}
    				}
    			}
    		}
    		// read directives
    		for(sel in directive){
    			if(directive.hasOwnProperty(sel)){
    				i = 0;
    				dsel = directive[sel];
    				sels = sel.split(/\s*,\s*/); //allow selector separation by quotes
    				sl = sels.length;
    				do{
    					if(typeof(dsel) === 'function' || typeof(dsel) === 'string'){
    						// set the value for the node/attr
    						sel = sels[i];
    						target = gettarget(dom, sel, false);
    						setsig(target, fns.length);
    						fns[fns.length] = wrapquote(target.quotefn, dataselectfn(dsel));
    					}else{
    						// loop on node
    						loopgen(dom, sel, dsel, fns);
    					}
    				}while(++i < sl);
    			}
    		}
            // convert node to a string 
            h = outerHTML(dom);
    		// IE adds an unremovable "selected, value" attribute
    		// hard replace while waiting for a better solution
            h = h.replace(/<([^>]+)\s(value\=""|selected)\s?([^>]*)>/ig, "<$1 $3>");
    		
            // remove attribute prefix
            h = h.split(attPfx).join('');
    
    		// slice the html string at "Sig"
    		parts = h.split( Sig );
    		// for each slice add the return string of 
    		for(i = 1; i < parts.length; i++){
    			p = parts[i];
    			// part is of the form "fn-number:..." as placed there by setsig.
    			pfns[i] = fns[ parseInt(p, 10) ];
    			parts[i] = p.substring( p.indexOf(':') + 1 );
    		}
    		return concatenator(parts, pfns);
    	}
    	// compile the template with directive
    	// if a context is passed, the autoRendering is triggered automatically
    	// return a function waiting the data as argument
    	function compile(directive, ctxt, template){
    		var rfn = compiler( ( template || this[0] ).cloneNode(true), directive, ctxt);
    		return function(context){
    			return rfn({context:context});
    		};
    	}
    	//compile with the directive as argument
    	// run the template function on the context argument
    	// return an HTML string 
    	// should replace the template and return this
    	function render(ctxt, directive){
    		var fn = typeof directive === 'function' && directive, i = 0, ii = this.length;
    		for(; i < ii; i++){
    			this[i] = replaceWith( this[i], (fn || plugins.compile( directive, false, this[i] ))( ctxt, false ));
    		}
    		context = null;
    		return this;
    	}
    
    	// compile the template with autoRender
    	// run the template function on the context argument
    	// return an HTML string 
    	function autoRender(ctxt, directive){
    		var fn = plugins.compile( directive, ctxt, this[0] );
    		for(var i = 0, ii = this.length; i < ii; i++){
    			this[i] = replaceWith( this[i], fn( ctxt, false));
    		}
    		context = null;
    		return this;
    	}
    	
    	function replaceWith(elm, html) {
    		var ne,
    			ep = elm.parentNode,
    			depth = 0;
    		if(!ep){ //if no parents
    			ep = document.createElement('DIV');
    			ep.appendChild(elm);
    		}
    		switch (elm.tagName) {
    			case 'TBODY': case 'THEAD': case 'TFOOT':
    				html = '<TABLE>' + html + '</TABLE>';
    				depth = 1;
    			break;
    			case 'TR':
    				html = '<TABLE><TBODY>' + html + '</TBODY></TABLE>';
    				depth = 2;
    			break;
    			case 'TD': case 'TH':
    				html = '<TABLE><TBODY><TR>' + html + '</TR></TBODY></TABLE>';
    				depth = 3;
    			break;
    		}
    		tmp = document.createElement('SPAN');
    		tmp.style.display = 'none';
    		document.body.appendChild(tmp);
    		tmp.innerHTML = html;
    		ne = tmp.firstChild;
    		while (depth--) {
    			ne = ne.firstChild;
    		}
    		ep.insertBefore(ne, elm);
    		ep.removeChild(elm);
    		document.body.removeChild(tmp);
    		elm = ne;
    
    		ne = ep = null;
    		return elm;
    	}
    
    	return plugins;
    };
    
    $p.plugins = {};
    
    $p.libs = {
    	dojo:function(){
    		if(typeof document.querySelector === 'undefined'){
    			$p.plugins.find = function(n, sel){
    				return dojo.query(sel, n);
    			};
    		}
    	},
    	domassistant:function(){
    		if(typeof document.querySelector === 'undefined'){
    			$p.plugins.find = function(n, sel){
    				return $(n).cssSelect(sel);
    			};
    		}
    		DOMAssistant.attach({ 
    			publicMethods : [ 'compile', 'render', 'autoRender'],
    			compile:function(directive, ctxt){
    				return $p([this]).compile(directive, ctxt);
    			},
    			render:function(ctxt, directive){
    				return $( $p([this]).render(ctxt, directive) )[0];
    			},
    			autoRender:function(ctxt, directive){
    				return $( $p([this]).autoRender(ctxt, directive) )[0];
    			}
    		});
    	},
    	jquery:function(){
    		if(typeof document.querySelector === 'undefined'){
    			$p.plugins.find = function(n, sel){
    				return jQuery(n).find(sel);
    			};
    		}
    		jQuery.fn.extend({
    			directives:function(directive){
    				this._pure_d = directive; return this;
    			},
    			compile:function(directive, ctxt){
    				return $p(this).compile(this._pure_d || directive, ctxt);
    			},
    			render:function(ctxt, directive){
    				return jQuery( $p( this ).render( ctxt, this._pure_d || directive ) );
    			},
    			autoRender:function(ctxt, directive){
    				return jQuery( $p( this ).autoRender( ctxt, this._pure_d || directive ) );
    			}
    		});
    	},
    	mootools:function(){
    		if(typeof document.querySelector === 'undefined'){
    			$p.plugins.find = function(n, sel){
    				return $(n).getElements(sel);
    			};
    		}
    		Element.implement({
    			compile:function(directive, ctxt){ 
    				return $p(this).compile(directive, ctxt);
    			},
    			render:function(ctxt, directive){
    				return $p([this]).render(ctxt, directive);
    			},
    			autoRender:function(ctxt, directive){
    				return $p([this]).autoRender(ctxt, directive);
    			}
    		});
    	},
    	prototype:function(){
    		if(typeof document.querySelector === 'undefined'){
    			$p.plugins.find = function(n, sel){
    				n = n === document ? n.body : n;
    				return typeof n === 'string' ? $$(n) : $(n).select(sel);
    			};
    		}
    		Element.addMethods({
    			compile:function(element, directive, ctxt){ 
    				return $p([element]).compile(directive, ctxt);
    			}, 
    			render:function(element, ctxt, directive){
    				return $p([element]).render(ctxt, directive);
    			}, 
    			autoRender:function(element, ctxt, directive){
    				return $p([element]).autoRender(ctxt, directive);
    			}
    		});
    	},
    	sizzle:function(){
    		if(typeof document.querySelector === 'undefined'){
    			$p.plugins.find = function(n, sel){
    				return Sizzle(sel, n);
    			};
    		}
    	},
    	sly:function(){
    		if(typeof document.querySelector === 'undefined'){  
    			$p.plugins.find = function(n, sel){
    				return Sly(sel, n);
    			};
    		}
    	}
    };
    
    // get lib specifics if available
    (function(){
    	var libkey = 
    		typeof dojo         !== 'undefined' && 'dojo' || 
    		typeof DOMAssistant !== 'undefined' && 'domassistant' ||
    		typeof jQuery       !== 'undefined' && 'jquery' || 
    		typeof MooTools     !== 'undefined' && 'mootools' ||
    		typeof Prototype    !== 'undefined' && 'prototype' || 
    		typeof Sizzle       !== 'undefined' && 'sizzle' ||
    		typeof Sly          !== 'undefined' && 'sly';
    		
    	libkey && $p.libs[libkey]();
    	
    	//for node.js
    	if(typeof exports !== 'undefined'){
    		exports.$p = $p;
    	}
    })();
  provide("pure", module.exports);
}(global));

// pakmanager:serialize-form
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  (function () {
      "use strict";
    
      var $ = window.jQuery || window.ender || window.$
        , iter = 'forEach'
        ;
    
      if (window.jQuery) {
        iter = 'each';
      }
    
      function serializeForm(formid, toNativeType) {
        var els = []; 
    
        function handleElement(e, i) {
          if (window.jQuery) {
            e = i;
          }
          var name = $(e).attr('name')
            , value = $(e).val()
            ;   
    
          if (toNativeType) {
            value = Number(value) || value;
          }
          if ('true' === value) {
            value = true;
          }
          if ('false' === value) {
            value = false;
          }
          if ('null' === value) {
            value = null;
          }
          /*
          // Not yet convinced that this is a good idea
          if ('undefined' === value) {
            value = undefined;
          }
          */
    
          if (!name || '' === value) {
            return;
          }   
    
          els.push({
              name: name
            , value: value
          }); 
        }   
    
        // TODO insert these in the array in the order
        // they appear in the form rather than by element
        $(formid + ' input')[iter](handleElement);
        $(formid + ' select')[iter](handleElement);
        $(formid + ' textarea')[iter](handleElement);
    
        return els;
      }
    
      // Note that this is a potentially lossy conversion.
      // By convention arrays are specified as `xyz[]`,
      // but objects have no such standard
      function mapFormData(data) {
        var obj = {}; 
    
        function map(datum) {
          var arr
            , name
            , len
            ;
    
          name = datum.name;
          len = datum.name.length;
    
          if ('[]' === datum.name.substr(len - 2)) {
            name = datum.name.substr(0, len - 2);
            arr = obj[name] = (obj[name] || []);
            arr.push(datum.value);
          } else {
            obj[datum.name] = datum.value;
          }
        }   
    
        data.forEach(map);
    
        return obj;
      }
    
      function serializeFormObject() {
        return mapFormData(serializeForm.apply(null, arguments));
      }
    
      function serializeFormUriEncoded() {
        var data = serializeForm.apply(null, arguments)
          , str = ''
          ;
    
        data.forEach(function (obj) {
          str += '&' + encodeURIComponent(obj.name) + '=' + encodeURIComponent(obj.value);
        });
        
        // remove leading '&'
        str = str.substr(1);
    
        return str;
      }
    
      module.exports.serializeForm = serializeForm;
      module.exports.serializeFormUriEncoded = serializeFormUriEncoded;
      module.exports.serializeFormArray = serializeForm;
      module.exports.serializeFormObject = serializeFormObject;
    }());
    
  provide("serialize-form", module.exports);
}(global));

// pakmanager:bookmarkleteer-browser/uglify
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  !function(n,e){"use strict";function t(n){for(var e=Object.create(null),t=0;t<n.length;++t)e[n[t]]=!0;return e}function i(n,e){return Array.prototype.slice.call(n,e||0)}function r(n){return n.split("")}function o(n,e){for(var t=e.length;--t>=0;)if(e[t]==n)return!0;return!1}function a(n,e){for(var t=0,i=e.length;i>t;++t)if(n(e[t]))return e[t]}function u(n,e){if(0>=e)return"";if(1==e)return n;var t=u(n,e>>1);return t+=t,1&e&&(t+=n),t}function s(n,e){this.msg=n,this.defs=e}function c(n,e,t){n===!0&&(n={});var i=n||{};if(t)for(var r in i)if(i.hasOwnProperty(r)&&!e.hasOwnProperty(r))throw new s("`"+r+"` is not a supported option",e);for(var r in e)e.hasOwnProperty(r)&&(i[r]=n&&n.hasOwnProperty(r)?n[r]:e[r]);return i}function f(n,e){for(var t in e)e.hasOwnProperty(t)&&(n[t]=e[t]);return n}function l(){}function p(n,e){n.indexOf(e)<0&&n.push(e)}function d(n,e){return n.replace(/\{(.+?)\}/g,function(n,t){return e[t]})}function h(n,e){for(var t=n.length;--t>=0;)n[t]===e&&n.splice(t,1)}function _(n,e){function t(n,t){for(var i=[],r=0,o=0,a=0;r<n.length&&o<t.length;)i[a++]=e(n[r],t[o])<=0?n[r++]:t[o++];return r<n.length&&i.push.apply(i,n.slice(r)),o<t.length&&i.push.apply(i,t.slice(o)),i}function i(n){if(n.length<=1)return n;var e=Math.floor(n.length/2),r=n.slice(0,e),o=n.slice(e);return r=i(r),o=i(o),t(r,o)}return n.length<2?n.slice():i(n)}function m(n,e){return n.filter(function(n){return e.indexOf(n)<0})}function v(n,e){return n.filter(function(n){return e.indexOf(n)>=0})}function b(n){function e(n){if(1==n.length)return t+="return str === "+JSON.stringify(n[0])+";";t+="switch(str){";for(var e=0;e<n.length;++e)t+="case "+JSON.stringify(n[e])+":";t+="return true}return false;"}n instanceof Array||(n=n.split(" "));var t="",i=[];n:for(var r=0;r<n.length;++r){for(var o=0;o<i.length;++o)if(i[o][0].length==n[r].length){i[o].push(n[r]);continue n}i.push([n[r]])}if(i.length>3){i.sort(function(n,e){return e.length-n.length}),t+="switch(str.length){";for(var r=0;r<i.length;++r){var a=i[r];t+="case "+a[0].length+":",e(a)}t+="}"}else e(n);return new Function("str",t)}function y(n,e){for(var t=n.length;--t>=0;)if(!e(n[t]))return!1;return!0}function g(){this._values=Object.create(null),this._size=0}function A(n,e,t,i){arguments.length<4&&(i=W),e=e?e.split(/\s+/):[];var r=e;i&&i.PROPS&&(e=e.concat(i.PROPS));for(var o="return function AST_"+n+"(props){ if (props) { ",a=e.length;--a>=0;)o+="this."+e[a]+" = props."+e[a]+";";var u=i&&new i;(u&&u.initialize||t&&t.initialize)&&(o+="this.initialize();"),o+="}}";var s=new Function(o)();if(u&&(s.prototype=u,s.BASE=i),i&&i.SUBCLASSES.push(s),s.prototype.CTOR=s,s.PROPS=e||null,s.SELF_PROPS=r,s.SUBCLASSES=[],n&&(s.prototype.TYPE=s.TYPE=n),t)for(a in t)t.hasOwnProperty(a)&&(/^\$/.test(a)?s[a.substr(1)]=t[a]:s.prototype[a]=t[a]);return s.DEFMETHOD=function(n,e){this.prototype[n]=e},s}function w(n,e){n.body instanceof Y?n.body._walk(e):n.body.forEach(function(n){n._walk(e)})}function E(n){this.visit=n,this.stack=[]}function D(n){return n>=97&&122>=n||n>=65&&90>=n||n>=170&&Rt.letter.test(String.fromCharCode(n))}function F(n){return n>=48&&57>=n}function S(n){return F(n)||D(n)}function C(n){return Rt.non_spacing_mark.test(n)||Rt.space_combining_mark.test(n)}function k(n){return Rt.connector_punctuation.test(n)}function B(n){return!Ft(n)&&/^[a-z_$][a-z0-9_$]*$/i.test(n)}function T(n){return 36==n||95==n||D(n)}function x(n){var e=n.charCodeAt(0);return T(e)||F(e)||8204==e||8205==e||C(n)||k(n)}function $(n){var e=n.length;if(0==e)return!1;if(F(n.charCodeAt(0)))return!1;for(;--e>=0;)if(!x(n.charAt(e)))return!1;return!0}function O(n){return kt.test(n)?parseInt(n.substr(2),16):Bt.test(n)?parseInt(n.substr(1),8):Tt.test(n)?parseFloat(n):void 0}function M(n,e,t,i){this.message=n,this.line=e,this.col=t,this.pos=i,this.stack=(new Error).stack}function N(n,e,t,i,r){throw new M(n,t,i,r)}function R(n,e,t){return n.type==e&&(null==t||n.value==t)}function H(n,e){function t(){return A.text.charAt(A.pos)}function i(n,e){var t=A.text.charAt(A.pos++);if(n&&!t)throw Ht;return"\n"==t?(A.newline_before=A.newline_before||!e,++A.line,A.col=0):++A.col,t}function r(n,e){var t=A.text.indexOf(n,A.pos);if(e&&-1==t)throw Ht;return t}function o(){A.tokline=A.line,A.tokcol=A.col,A.tokpos=A.pos}function a(n,t,i){A.regex_allowed="operator"==n&&!zt[t]||"keyword"==n&&St(t)||"punc"==n&&Ot(t);var r={type:n,value:t,line:A.tokline,col:A.tokcol,pos:A.tokpos,endpos:A.pos,nlb:A.newline_before,file:e};if(!i){r.comments_before=A.comments_before,A.comments_before=[];for(var o=0,a=r.comments_before.length;a>o;o++)r.nlb=r.nlb||r.comments_before[o].nlb}return A.newline_before=!1,new V(r)}function u(){for(;$t(t());)i()}function s(n){for(var e,r="",o=0;(e=t())&&n(e,o++);)r+=i();return r}function c(n){N(n,e,A.tokline,A.tokcol,A.tokpos)}function f(n){var e=!1,t=!1,i=!1,r="."==n,o=s(function(o,a){var u=o.charCodeAt(0);switch(u){case 120:case 88:return i?!1:i=!0;case 101:case 69:return i?!0:e?!1:e=t=!0;case 45:return t||0==a&&!n;case 43:return t;case t=!1,46:return r||i||e?!1:r=!0}return S(u)});n&&(o=n+o);var u=O(o);return isNaN(u)?(c("Invalid syntax: "+o),void 0):a("num",u)}function l(n){var e=i(!0,n);switch(e.charCodeAt(0)){case 110:return"\n";case 114:return"\r";case 116:return"	";case 98:return"\b";case 118:return"";case 102:return"\f";case 48:return"\0";case 120:return String.fromCharCode(p(2));case 117:return String.fromCharCode(p(4));case 10:return"";default:return e}}function p(n){for(var e=0;n>0;--n){var t=parseInt(i(!0),16);isNaN(t)&&c("Invalid hex-character pattern in string"),e=e<<4|t}return e}function d(){i();var n,e=r("\n");return-1==e?(n=A.text.substr(A.pos),A.pos=A.text.length):(n=A.text.substring(A.pos,e),A.pos=e),a("comment1",n,!0)}function h(){for(var n,e,r=!1,o="",a=!1;null!=(n=t());)if(r)"u"!=n&&c("Expecting UnicodeEscapeSequence -- uXXXX"),n=l(),x(n)||c("Unicode char: "+n.charCodeAt(0)+" is not valid in identifier"),o+=n,r=!1;else if("\\"==n)a=r=!0,i();else{if(!x(n))break;o+=i()}return Et(o)&&a&&(e=o.charCodeAt(0).toString(16).toUpperCase(),o="\\u"+"0000".substr(e.length)+e+o.slice(1)),o}function _(n){function e(n){if(!t())return n;var r=n+t();return xt(r)?(i(),e(r)):n}return a("operator",e(n||i()))}function m(){i();var n=A.regex_allowed;switch(t()){case"/":return A.comments_before.push(d()),A.regex_allowed=n,g();case"*":return A.comments_before.push(E()),A.regex_allowed=n,g()}return A.regex_allowed?D(""):_("/")}function v(){return i(),F(t().charCodeAt(0))?f("."):a("punc",".")}function b(){var n=h();return Dt(n)?a("atom",n):Et(n)?xt(n)?a("operator",n):a("keyword",n):a("name",n)}function y(n,e){return function(t){try{return e(t)}catch(i){if(i!==Ht)throw i;c(n)}}}function g(n){if(null!=n)return D(n);u(),o();var e=t();if(!e)return a("eof");var r=e.charCodeAt(0);switch(r){case 34:case 39:return w();case 46:return v();case 47:return m()}return F(r)?f():Mt(e)?a("punc",i()):Ct(e)?_():92==r||T(r)?b():(c("Unexpected character '"+e+"'"),void 0)}var A={text:n.replace(/\r\n?|[\n\u2028\u2029]/g,"\n").replace(/\uFEFF/g,""),filename:e,pos:0,tokpos:0,line:1,tokline:0,col:0,tokcol:0,newline_before:!1,regex_allowed:!1,comments_before:[]},w=y("Unterminated string constant",function(){for(var n=i(),e="";;){var t=i(!0);if("\\"==t){var r=0,o=null;t=s(function(n){if(n>="0"&&"7">=n){if(!o)return o=n,++r;if("3">=o&&2>=r)return++r;if(o>="4"&&1>=r)return++r}return!1}),t=r>0?String.fromCharCode(parseInt(t,8)):l(!0)}else if(t==n)break;e+=t}return a("string",e)}),E=y("Unterminated multiline comment",function(){i();var n=r("*/",!0),e=A.text.substring(A.pos,n),t=e.split("\n"),o=t.length;return A.pos=n+2,A.line+=o-1,o>1?A.col=t[o-1].length:A.col+=t[o-1].length,A.col+=2,A.newline_before=A.newline_before||e.indexOf("\n")>=0,a("comment2",e,!0)}),D=y("Unterminated regular expression",function(n){for(var e,t=!1,r=!1;e=i(!0);)if(t)n+="\\"+e,t=!1;else if("["==e)r=!0,n+=e;else if("]"==e&&r)r=!1,n+=e;else{if("/"==e&&!r)break;"\\"==e?t=!0:n+=e}var o=h();return a("regexp",new RegExp(n,o))});return g.context=function(n){return n&&(A=n),A},g}function q(n,e){function t(n,e){return R(P.token,n,e)}function i(){return P.peeked||(P.peeked=P.input())}function r(){return P.prev=P.token,P.peeked?(P.token=P.peeked,P.peeked=null):P.token=P.input(),P.in_directives=P.in_directives&&("string"==P.token.type||t("punc",";")),P.token}function o(){return P.prev}function u(n,e,t,i){var r=P.input.context();N(n,r.filename,null!=e?e:r.tokline,null!=t?t:r.tokcol,null!=i?i:r.tokpos)}function s(n,e){u(e,n.line,n.col)}function f(n){null==n&&(n=P.token),s(n,"Unexpected token: "+n.type+" ("+n.value+")")}function l(n,e){return t(n,e)?r():(s(P.token,"Unexpected token "+P.token.type+" «"+P.token.value+"»"+", expected "+n+" «"+e+"»"),void 0)}function p(n){return l("punc",n)}function d(){return!e.strict&&(P.token.nlb||t("eof")||t("punc","}"))}function h(){t("punc",";")?r():d()||f()}function _(){p("(");var n=_e(!0);return p(")"),n}function m(n){return function(){var e=P.token,t=n(),i=o();return t.start=e,t.end=i,t}}function v(){var n=$(at);a(function(e){return e.name==n.name},P.labels)&&u("Label "+n.name+" defined twice"),p(":"),P.labels.push(n);var e=j();return P.labels.pop(),new ee({body:e,label:n})}function b(n){return new J({body:(n=_e(!0),h(),n)})}function y(n){var e=null;return d()||(e=$(st,!0)),null!=e?a(function(n){return n.name==e.name},P.labels)||u("Undefined label "+e.name):0==P.in_loop&&u(n.TYPE+" not inside a loop or switch"),h(),new n({label:e})}function g(){p("(");var n=null;return!t("punc",";")&&(n=t("keyword","var")?(r(),U(!0)):_e(!0,!0),t("operator","in"))?(n instanceof Te&&n.definitions.length>1&&u("Only one variable declaration allowed in for..in loop"),r(),w(n)):A(n)}function A(n){p(";");var e=t("punc",";")?null:_e(!0);p(";");var i=t("punc",")")?null:_e(!0);return p(")"),new oe({init:n,condition:e,step:i,body:z(j)})}function w(n){var e=n instanceof Te?n.definitions[0].name:null,t=_e(!0);return p(")"),new ae({init:n,name:e,object:t,body:z(j)})}function E(){var n=_(),e=j(),i=null;return t("keyword","else")&&(r(),i=j()),new Ae({condition:n,body:e,alternative:i})}function D(){p("{");for(var n=[];!t("punc","}");)t("eof")&&f(),n.push(j());return r(),n}function F(){p("{");for(var n,e=[],i=null,a=null;!t("punc","}");)t("eof")&&f(),t("keyword","case")?(a&&(a.end=o()),i=[],a=new Fe({start:(n=P.token,r(),n),expression:_e(!0),body:i}),e.push(a),p(":")):t("keyword","default")?(a&&(a.end=o()),i=[],a=new De({start:(n=P.token,r(),p(":"),n),body:i}),e.push(a)):(i||f(),i.push(j()));return a&&(a.end=o()),r(),e}function S(){var n=D(),e=null,i=null;if(t("keyword","catch")){var a=P.token;r(),p("(");var s=$(ot);p(")"),e=new Ce({start:a,argname:s,body:D(),end:o()})}if(t("keyword","finally")){var a=P.token;r(),i=new ke({start:a,body:D(),end:o()})}return e||i||u("Missing catch/finally blocks"),new Se({body:n,bcatch:e,bfinally:i})}function C(n,e){for(var i=[];i.push(new $e({start:P.token,name:$(e?et:nt),value:t("operator","=")?(r(),_e(!1,n)):null,end:o()})),t("punc",",");)r();return i}function k(){var n,e=P.token;switch(e.type){case"name":return $(ut);case"num":n=new pt({start:e,end:e,value:e.value});break;case"string":n=new lt({start:e,end:e,value:e.value});break;case"regexp":n=new dt({start:e,end:e,value:e.value});break;case"atom":switch(e.value){case"false":n=new At({start:e,end:e});break;case"true":n=new wt({start:e,end:e});break;case"null":n=new _t({start:e,end:e})}}return r(),n}function B(n,e,i){for(var o=!0,a=[];!t("punc",n)&&(o?o=!1:p(","),!e||!t("punc",n));)t("punc",",")&&i?a.push(new bt({start:P.token,end:P.token})):a.push(_e(!1));return r(),a}function T(){var n=P.token;switch(r(),n.type){case"num":case"string":case"name":case"operator":case"keyword":case"atom":return n.value;default:f()}}function x(){var n=P.token;switch(r(),n.type){case"name":case"operator":case"keyword":case"atom":return n.value;default:f()}}function $(n,e){if(!t("name"))return e||u("Name expected"),null;var i=P.token.value,o=new("this"==i?ct:n)({name:String(P.token.value),start:P.token,end:P.token});return r(),o}function O(n,e,t){return"++"!=e&&"--"!=e||q(t)||u("Invalid use of "+e+" operator"),new n({operator:e,expression:t})}function M(n){return se(te(!0),0,n)}function q(n){return e.strict?n instanceof ct?!1:n instanceof Re||n instanceof Ke:!0}function z(n){++P.in_loop;var e=n();return--P.in_loop,e}e=c(e,{strict:!1,filename:null,toplevel:null,expression:!1});var P={input:"string"==typeof n?H(n,e.filename):n,token:null,prev:null,peeked:null,in_function:0,in_directives:!0,in_loop:0,labels:[]};P.token=r();var j=m(function(){var n;switch((t("operator","/")||t("operator","/="))&&(P.peeked=null,P.token=P.input(P.token.value.substr(1))),P.token.type){case"string":var e=P.in_directives,a=b();return e&&a.body instanceof lt&&!t("punc",",")?new G({value:a.body.value}):a;case"num":case"regexp":case"operator":case"atom":return b();case"name":return R(i(),"punc",":")?v():b();case"punc":switch(P.token.value){case"{":return new Z({start:P.token,body:D(),end:o()});case"[":case"(":return b();case";":return r(),new Q;default:f()}case"keyword":switch(n=P.token.value,r(),n){case"break":return y(ye);case"continue":return y(ge);case"debugger":return h(),new X;case"do":return new ie({body:z(j),condition:(l("keyword","while"),n=_(),h(),n)});case"while":return new re({condition:_(),body:z(j)});case"for":return g();case"function":return I(!0);case"if":return E();case"return":return 0==P.in_function&&u("'return' outside of function"),new me({value:t("punc",";")?(r(),null):d()?null:(n=_e(!0),h(),n)});case"switch":return new we({expression:_(),body:z(F)});case"throw":return P.token.nlb&&u("Illegal newline after 'throw'"),new ve({value:(n=_e(!0),h(),n)});case"try":return S();case"var":return n=U(),h(),n;case"const":return n=L(),h(),n;case"with":return new ue({expression:_(),body:j()});default:f()}}}),I=function(n,e){var i=e===le,o=t("name")?$(n?it:i?Ze:rt):i&&(t("string")||t("num"))?k():null;return n&&!o&&f(),p("("),e||(e=n?de:pe),new e({name:o,argnames:function(n,e){for(;!t("punc",")");)n?n=!1:p(","),e.push($(tt));return r(),e}(!0,[]),body:function(n,e){++P.in_function,P.in_directives=!0,P.in_loop=0,P.labels=[];var t=D();return--P.in_function,P.in_loop=n,P.labels=e,t}(P.in_loop,P.labels)})},U=function(n){return new Te({start:o(),definitions:C(n,!1),end:o()})},L=function(){return new xe({start:o(),definitions:C(!1,!0),end:o()})},V=function(){var n=P.token;l("operator","new");var e,i=W(!1);return t("punc","(")?(r(),e=B(")")):e=[],ne(new Me({start:n,expression:i,args:e,end:o()}),!0)},W=function(n){if(t("operator","new"))return V();var e=P.token;if(t("punc")){switch(e.value){case"(":r();var i=_e(!0);return i.start=e,i.end=P.token,p(")"),ne(i,n);case"[":return ne(Y(),n);case"{":return ne(K(),n)}f()}if(t("keyword","function")){r();var a=I(!1);return a.start=e,a.end=o(),ne(a,n)}return Ut[P.token.type]?ne(k(),n):(f(),void 0)},Y=m(function(){return p("["),new Ve({elements:B("]",!e.strict,!0)})}),K=m(function(){p("{");for(var n=!0,i=[];!t("punc","}")&&(n?n=!1:p(","),e.strict||!t("punc","}"));){var a=P.token,u=a.type,s=T();if("name"==u&&!t("punc",":")){if("get"==s){i.push(new Je({start:a,key:s,value:I(!1,le),end:o()}));continue}if("set"==s){i.push(new Ge({start:a,key:s,value:I(!1,le),end:o()}));continue}}p(":"),i.push(new Xe({start:a,key:s,value:_e(!1),end:o()}))}return r(),new We({properties:i})}),ne=function(n,e){var i=n.start;if(t("punc","."))return r(),ne(new He({start:i,expression:n,property:x(),end:o()}),e);if(t("punc","[")){r();var a=_e(!0);return p("]"),ne(new qe({start:i,expression:n,property:a,end:o()}),e)}return e&&t("punc","(")?(r(),ne(new Oe({start:i,expression:n,args:B(")"),end:o()}),!0)):n},te=function(n){var e=P.token;if(t("operator")&&qt(e.value)){r();var i=O(Pe,e.value,te(n));return i.start=e,i.end=o(),i}for(var a=W(n);t("operator")&&zt(P.token.value)&&!P.token.nlb;)a=O(je,P.token.value,a),a.start=e,a.end=P.token,r();return a},se=function(n,e,i){var o=t("operator")?P.token.value:null;"in"==o&&i&&(o=null);var a=null!=o?jt[o]:null;if(null!=a&&a>e){r();var u=se(te(!0),a,i);return se(new Ie({start:n.start,left:n,operator:o,right:u,end:u.end}),e,i)}return n},fe=function(n){var e=P.token,o=M(n);if(t("operator","?")){r();var a=_e(!1);return p(":"),new Ue({start:e,condition:o,consequent:a,alternative:_e(!1,n),end:i()})}return o},he=function(n){var e=P.token,i=fe(n),a=P.token.value;if(t("operator")&&Pt(a)){if(q(i))return r(),new Le({start:e,left:i,operator:a,right:he(n),end:o()});u("Invalid assignment")}return i},_e=function(n,e){var o=P.token,a=he(e);return n&&t("punc",",")?(r(),new Ne({start:o,car:a,cdr:_e(!0,e),end:i()})):a};return e.expression?_e(!0):function(){for(var n=P.token,i=[];!t("eof");)i.push(j());var r=o(),a=e.toplevel;return a?(a.body=a.body.concat(i),a.end=r):a=new ce({start:n,body:i,end:r}),a}()}function z(n,e){E.call(this),this.before=n,this.after=e}function P(n,e,t){this.name=t.name,this.orig=[t],this.scope=n,this.references=[],this.global=!1,this.mangled_name=null,this.undeclared=!1,this.constant=!1,this.index=e}function j(n){function e(n,e){return n.replace(/[\u0080-\uffff]/g,function(n){var t=n.charCodeAt(0).toString(16);if(t.length<=2&&!e){for(;t.length<2;)t="0"+t;return"\\x"+t}for(;t.length<4;)t="0"+t;return"\\u"+t})}function t(t){var i=0,r=0;return t=t.replace(/[\\\b\f\n\r\t\x22\x27\u2028\u2029\0]/g,function(n){switch(n){case"\\":return"\\\\";case"\b":return"\\b";case"\f":return"\\f";case"\n":return"\\n";case"\r":return"\\r";case"\u2028":return"\\u2028";case"\u2029":return"\\u2029";case'"':return++i,'"';case"'":return++r,"'";case"\0":return"\\0"}return n}),n.ascii_only&&(t=e(t)),i>r?"'"+t.replace(/\x27/g,"\\'")+"'":'"'+t.replace(/\x22/g,'\\"')+'"'}function i(e){var i=t(e);return n.inline_script&&(i=i.replace(/<\x2fscript([>\/\t\n\f\r ])/gi,"<\\/script$1")),i}function r(t){return t=t.toString(),n.ascii_only&&(t=e(t,!0)),t}function o(e){return u(" ",n.indent_start+A-e*n.indent_level)}function a(){return k.charAt(k.length-1)}function s(){n.max_line_len&&w>n.max_line_len&&f("\n")}function f(e){e=String(e);var t=e.charAt(0);if(C&&(t&&!(";}".indexOf(t)<0)||/[;]$/.test(k)||(n.semicolons||B(t)?(F+=";",w++,D++):(F+="\n",D++,E++,w=0),n.beautify||(S=!1)),C=!1,s()),!n.beautify&&n.preserve_line&&H[H.length-1])for(var i=H[H.length-1].start.line;i>E;)F+="\n",D++,E++,w=0,S=!1;if(S){var r=a();(x(r)&&(x(t)||"\\"==t)||/^[\+\-\/]$/.test(t)&&t==r)&&(F+=" ",w++,D++),S=!1}var o=e.split(/\r?\n/),u=o.length-1;E+=u,0==u?w+=o[u].length:w=o[u].length,D+=e.length,k=e,F+=e}function p(){C=!1,f(";")}function d(){return A+n.indent_level}function h(n){var e;return f("{"),M(),O(d(),function(){e=n()}),$(),f("}"),e}function _(n){f("(");var e=n();return f(")"),e}function m(n){f("[");var e=n();return f("]"),e}function v(){f(","),T()}function y(){f(":"),n.space_colon&&T()}function g(){return F}n=c(n,{indent_start:0,indent_level:4,quote_keys:!1,space_colon:!0,ascii_only:!1,inline_script:!1,width:80,max_line_len:32e3,ie_proof:!0,beautify:!1,source_map:null,bracketize:!1,semicolons:!0,comments:!1,preserve_line:!1},!0);var A=0,w=0,E=1,D=0,F="",S=!1,C=!1,k=null,B=b("( [ + * / - , ."),T=n.beautify?function(){f(" ")}:function(){S=!0},$=n.beautify?function(e){n.beautify&&f(o(e?.5:0))}:l,O=n.beautify?function(n,e){n===!0&&(n=d());var t=A;A=n;var i=e();return A=t,i}:function(n,e){return e()},M=n.beautify?function(){f("\n")}:l,N=n.beautify?function(){f(";")}:function(){C=!0},R=n.source_map?function(e,t){try{e&&n.source_map.add(e.file||"?",E,w,e.line,e.col,t||"name"!=e.type?t:e.value)}catch(i){W.warn("Couldn't figure out mapping for {file}:{line},{col} → {cline},{ccol} [{name}]",{file:e.file,line:e.line,col:e.col,cline:E,ccol:w,name:t||""})}}:l,H=[];return{get:g,toString:g,indent:$,indentation:function(){return A},current_width:function(){return w-A},should_break:function(){return n.width&&this.current_width()>=n.width},newline:M,print:f,space:T,comma:v,colon:y,last:function(){return k},semicolon:N,force_semicolon:p,to_ascii:e,print_name:function(n){f(r(n))},print_string:function(n){f(i(n))},next_indent:d,with_indent:O,with_block:h,with_parens:_,with_square:m,add_mapping:R,option:function(e){return n[e]},line:function(){return E},col:function(){return w},pos:function(){return D},push_node:function(n){H.push(n)},pop_node:function(){return H.pop()},stack:function(){return H},parent:function(n){return H[H.length-2-(n||0)]}}}function I(n,e){return this instanceof I?(z.call(this,this.before,this.after),this.options=c(n,{sequences:!e,properties:!e,dead_code:!e,drop_debugger:!e,unsafe:!1,unsafe_comps:!1,conditionals:!e,comparisons:!e,evaluate:!e,booleans:!e,loops:!e,unused:!e,hoist_funs:!e,hoist_vars:!1,if_return:!e,join_vars:!e,cascade:!e,side_effects:!e,screw_ie8:!1,warnings:!0,global_defs:{}},!0),void 0):new I(n,e)}function U(n){function e(n,e,r,o,a,u){if(i){var s=i.originalPositionFor({line:o,column:a});n=s.source,o=s.line,a=s.column,u=s.name}t.addMapping({generated:{line:e,column:r},original:{line:o,column:a},source:n,name:u})}n=c(n,{file:null,root:null,orig:null});var t=new MOZ_SourceMap.SourceMapGenerator({file:n.file,sourceRoot:n.root}),i=n.orig&&new MOZ_SourceMap.SourceMapConsumer(n.orig);return{add:e,get:function(){return t},toString:function(){return t.toString()}}}e.UglifyJS=n;var L=function(){function n(n,o,a){function u(){var u=o(n[s],s),l=u instanceof i;return l&&(u=u.v),u instanceof e?(u=u.v,u instanceof t?f.push.apply(f,a?u.v.slice().reverse():u.v):f.push(u)):u!==r&&(u instanceof t?c.push.apply(c,a?u.v.slice().reverse():u.v):c.push(u)),l}var s,c=[],f=[];if(n instanceof Array)if(a){for(s=n.length;--s>=0&&!u(););c.reverse(),f.reverse()}else for(s=0;s<n.length&&!u();++s);else for(s in n)if(n.hasOwnProperty(s)&&u())break;return f.concat(c)}function e(n){this.v=n}function t(n){this.v=n}function i(n){this.v=n}n.at_top=function(n){return new e(n)},n.splice=function(n){return new t(n)},n.last=function(n){return new i(n)};var r=n.skip={};return n}();g.prototype={set:function(n,e){return this.has(n)||++this._size,this._values["$"+n]=e,this},add:function(n,e){return this.has(n)?this.get(n).push(e):this.set(n,[e]),this},get:function(n){return this._values["$"+n]},del:function(n){return this.has(n)&&(--this._size,delete this._values["$"+n]),this},has:function(n){return"$"+n in this._values},each:function(n){for(var e in this._values)n(this._values[e],e.substr(1))},size:function(){return this._size},map:function(n){var e=[];for(var t in this._values)e.push(n(this._values[t],t.substr(1)));return e}};var V=A("Token","type value line col pos endpos nlb comments_before file",{},null),W=A("Node","start end",{clone:function(){return new this.CTOR(this)},$documentation:"Base class of all AST nodes",$propdoc:{start:"[AST_Token] The first token of this node",end:"[AST_Token] The last token of this node"},_walk:function(n){return n._visit(this)},walk:function(n){return this._walk(n)}},null);W.warn_function=null,W.warn=function(n,e){W.warn_function&&W.warn_function(d(n,e))};var Y=A("Statement",null,{$documentation:"Base class of all statements"}),X=A("Debugger",null,{$documentation:"Represents a debugger statement"},Y),G=A("Directive","value scope",{$documentation:'Represents a directive, like "use strict";',$propdoc:{value:"[string] The value of this directive as a plain string (it's not an AST_String!)",scope:"[AST_Scope/S] The scope that this directive affects"}},Y),J=A("SimpleStatement","body",{$documentation:"A statement consisting of an expression, i.e. a = 1 + 2",$propdoc:{body:"[AST_Node] an expression node (should not be instanceof AST_Statement)"},_walk:function(n){return n._visit(this,function(){this.body._walk(n)})}},Y),K=A("Block","body",{$documentation:"A body of statements (usually bracketed)",$propdoc:{body:"[AST_Statement*] an array of statements"},_walk:function(n){return n._visit(this,function(){w(this,n)})}},Y),Z=A("BlockStatement",null,{$documentation:"A block statement"},K),Q=A("EmptyStatement",null,{$documentation:"The empty statement (empty block or simply a semicolon)",_walk:function(n){return n._visit(this)}},Y),ne=A("StatementWithBody","body",{$documentation:"Base class for all statements that contain one nested body: `For`, `ForIn`, `Do`, `While`, `With`",$propdoc:{body:"[AST_Statement] the body; this should always be present, even if it's an AST_EmptyStatement"},_walk:function(n){return n._visit(this,function(){this.body._walk(n)})}},Y),ee=A("LabeledStatement","label",{$documentation:"Statement with a label",$propdoc:{label:"[AST_Label] a label definition"},_walk:function(n){return n._visit(this,function(){this.label._walk(n),this.body._walk(n)})}},ne),te=A("DWLoop","condition",{$documentation:"Base class for do/while statements",$propdoc:{condition:"[AST_Node] the loop condition.  Should not be instanceof AST_Statement"},_walk:function(n){return n._visit(this,function(){this.condition._walk(n),this.body._walk(n)})}},ne),ie=A("Do",null,{$documentation:"A `do` statement"},te),re=A("While",null,{$documentation:"A `while` statement"},te),oe=A("For","init condition step",{$documentation:"A `for` statement",$propdoc:{init:"[AST_Node?] the `for` initialization code, or null if empty",condition:"[AST_Node?] the `for` termination clause, or null if empty",step:"[AST_Node?] the `for` update clause, or null if empty"},_walk:function(n){return n._visit(this,function(){this.init&&this.init._walk(n),this.condition&&this.condition._walk(n),this.step&&this.step._walk(n),this.body._walk(n)})}},ne),ae=A("ForIn","init name object",{$documentation:"A `for ... in` statement",$propdoc:{init:"[AST_Node] the `for/in` initialization code",name:"[AST_SymbolRef?] the loop variable, only if `init` is AST_Var",object:"[AST_Node] the object that we're looping through"},_walk:function(n){return n._visit(this,function(){this.init._walk(n),this.object._walk(n),this.body._walk(n)})}},ne),ue=A("With","expression",{$documentation:"A `with` statement",$propdoc:{expression:"[AST_Node] the `with` expression"},_walk:function(n){return n._visit(this,function(){this.expression._walk(n),this.body._walk(n)})}},ne),se=A("Scope","directives variables functions uses_with uses_eval parent_scope enclosed cname",{$documentation:"Base class for all statements introducing a lexical scope",$propdoc:{directives:"[string*/S] an array of directives declared in this scope",variables:"[Object/S] a map of name -> SymbolDef for all variables/functions defined in this scope",functions:"[Object/S] like `variables`, but only lists function declarations",uses_with:"[boolean/S] tells whether this scope uses the `with` statement",uses_eval:"[boolean/S] tells whether this scope contains a direct call to the global `eval`",parent_scope:"[AST_Scope?/S] link to the parent scope",enclosed:"[SymbolDef*/S] a list of all symbol definitions that are accessed from this scope or any subscopes",cname:"[integer/S] current index for mangling variables (used internally by the mangler)"}},K),ce=A("Toplevel","globals",{$documentation:"The toplevel scope",$propdoc:{globals:"[Object/S] a map of name -> SymbolDef for all undeclared names"},wrap_enclose:function(n){var e=this,t=[],i=[];n.forEach(function(n){var e=n.split(":");t.push(e[0]),i.push(e[1])});var r="(function("+i.join(",")+"){ '$ORIG'; })("+t.join(",")+")";return r=q(r),r=r.transform(new z(function(n){return n instanceof G&&"$ORIG"==n.value?L.splice(e.body):void 0}))},wrap_commonjs:function(n,e){var t=this,i=[];e&&(t.figure_out_scope(),t.walk(new E(function(n){n instanceof Qe&&n.definition().global&&(a(function(e){return e.name==n.name},i)||i.push(n))})));var r="(function(exports, global){ global['"+n+"'] = exports; '$ORIG'; '$EXPORTS'; }({}, (function(){return this}())))";return r=q(r),r=r.transform(new z(function(n){if(n instanceof J&&(n=n.body,n instanceof lt))switch(n.getValue()){case"$ORIG":return L.splice(t.body);case"$EXPORTS":var e=[];return i.forEach(function(n){e.push(new J({body:new Le({left:new qe({expression:new ut({name:"exports"}),property:new lt({value:n.name})}),operator:"=",right:new ut(n)})}))}),L.splice(e)}}))}},se),fe=A("Lambda","name argnames uses_arguments",{$documentation:"Base class for functions",$propdoc:{name:"[AST_SymbolDeclaration?] the name of this function",argnames:"[AST_SymbolFunarg*] array of function arguments",uses_arguments:"[boolean/S] tells whether this function accesses the arguments array"},_walk:function(n){return n._visit(this,function(){this.name&&this.name._walk(n),this.argnames.forEach(function(e){e._walk(n)}),w(this,n)})}},se),le=A("Accessor",null,{$documentation:"A setter/getter function"},fe),pe=A("Function",null,{$documentation:"A function expression"},fe),de=A("Defun",null,{$documentation:"A function definition"},fe),he=A("Jump",null,{$documentation:"Base class for “jumps” (for now that's `return`, `throw`, `break` and `continue`)"},Y),_e=A("Exit","value",{$documentation:"Base class for “exits” (`return` and `throw`)",$propdoc:{value:"[AST_Node?] the value returned or thrown by this statement; could be null for AST_Return"},_walk:function(n){return n._visit(this,this.value&&function(){this.value._walk(n)})}},he),me=A("Return",null,{$documentation:"A `return` statement"},_e),ve=A("Throw",null,{$documentation:"A `throw` statement"},_e),be=A("LoopControl","label",{$documentation:"Base class for loop control statements (`break` and `continue`)",$propdoc:{label:"[AST_LabelRef?] the label, or null if none"},_walk:function(n){return n._visit(this,this.label&&function(){this.label._walk(n)})}},he),ye=A("Break",null,{$documentation:"A `break` statement"},be),ge=A("Continue",null,{$documentation:"A `continue` statement"},be),Ae=A("If","condition alternative",{$documentation:"A `if` statement",$propdoc:{condition:"[AST_Node] the `if` condition",alternative:"[AST_Statement?] the `else` part, or null if not present"},_walk:function(n){return n._visit(this,function(){this.condition._walk(n),this.body._walk(n),this.alternative&&this.alternative._walk(n)})}},ne),we=A("Switch","expression",{$documentation:"A `switch` statement",$propdoc:{expression:"[AST_Node] the `switch` “discriminant”"},_walk:function(n){return n._visit(this,function(){this.expression._walk(n),w(this,n)})}},K),Ee=A("SwitchBranch",null,{$documentation:"Base class for `switch` branches"},K),De=A("Default",null,{$documentation:"A `default` switch branch"},Ee),Fe=A("Case","expression",{$documentation:"A `case` switch branch",$propdoc:{expression:"[AST_Node] the `case` expression"},_walk:function(n){return n._visit(this,function(){this.expression._walk(n),w(this,n)})}},Ee),Se=A("Try","bcatch bfinally",{$documentation:"A `try` statement",$propdoc:{bcatch:"[AST_Catch?] the catch block, or null if not present",bfinally:"[AST_Finally?] the finally block, or null if not present"},_walk:function(n){return n._visit(this,function(){w(this,n),this.bcatch&&this.bcatch._walk(n),this.bfinally&&this.bfinally._walk(n)})}},K),Ce=A("Catch","argname",{$documentation:"A `catch` node; only makes sense as part of a `try` statement",$propdoc:{argname:"[AST_SymbolCatch] symbol for the exception"},_walk:function(n){return n._visit(this,function(){this.argname._walk(n),w(this,n)})}},K),ke=A("Finally",null,{$documentation:"A `finally` node; only makes sense as part of a `try` statement"},K),Be=A("Definitions","definitions",{$documentation:"Base class for `var` or `const` nodes (variable declarations/initializations)",$propdoc:{definitions:"[AST_VarDef*] array of variable definitions"},_walk:function(n){return n._visit(this,function(){this.definitions.forEach(function(e){e._walk(n)})})}},Y),Te=A("Var",null,{$documentation:"A `var` statement"},Be),xe=A("Const",null,{$documentation:"A `const` statement"},Be),$e=A("VarDef","name value",{$documentation:"A variable declaration; only appears in a AST_Definitions node",$propdoc:{name:"[AST_SymbolVar|AST_SymbolConst] name of the variable",value:"[AST_Node?] initializer, or null of there's no initializer"},_walk:function(n){return n._visit(this,function(){this.name._walk(n),this.value&&this.value._walk(n)})}}),Oe=A("Call","expression args",{$documentation:"A function call expression",$propdoc:{expression:"[AST_Node] expression to invoke as function",args:"[AST_Node*] array of arguments"},_walk:function(n){return n._visit(this,function(){this.expression._walk(n),this.args.forEach(function(e){e._walk(n)
    })})}}),Me=A("New",null,{$documentation:"An object instantiation.  Derives from a function call since it has exactly the same properties"},Oe),Ne=A("Seq","car cdr",{$documentation:"A sequence expression (two comma-separated expressions)",$propdoc:{car:"[AST_Node] first element in sequence",cdr:"[AST_Node] second element in sequence"},$cons:function(n,e){var t=new Ne(n);return t.car=n,t.cdr=e,t},$from_array:function(n){if(0==n.length)return null;if(1==n.length)return n[0].clone();for(var e=null,t=n.length;--t>=0;)e=Ne.cons(n[t],e);for(var i=e;i;){if(i.cdr&&!i.cdr.cdr){i.cdr=i.cdr.car;break}i=i.cdr}return e},to_array:function(){for(var n=this,e=[];n;){if(e.push(n.car),n.cdr&&!(n.cdr instanceof Ne)){e.push(n.cdr);break}n=n.cdr}return e},add:function(n){for(var e=this;e;){if(!(e.cdr instanceof Ne)){var t=Ne.cons(e.cdr,n);return e.cdr=t}e=e.cdr}},_walk:function(n){return n._visit(this,function(){this.car._walk(n),this.cdr&&this.cdr._walk(n)})}}),Re=A("PropAccess","expression property",{$documentation:'Base class for property access expressions, i.e. `a.foo` or `a["foo"]`',$propdoc:{expression:"[AST_Node] the “container” expression",property:"[AST_Node|string] the property to access.  For AST_Dot this is always a plain string, while for AST_Sub it's an arbitrary AST_Node"}}),He=A("Dot",null,{$documentation:"A dotted property access expression",_walk:function(n){return n._visit(this,function(){this.expression._walk(n)})}},Re),qe=A("Sub",null,{$documentation:'Index-style property access, i.e. `a["foo"]`',_walk:function(n){return n._visit(this,function(){this.expression._walk(n),this.property._walk(n)})}},Re),ze=A("Unary","operator expression",{$documentation:"Base class for unary expressions",$propdoc:{operator:"[string] the operator",expression:"[AST_Node] expression that this unary operator applies to"},_walk:function(n){return n._visit(this,function(){this.expression._walk(n)})}}),Pe=A("UnaryPrefix",null,{$documentation:"Unary prefix expression, i.e. `typeof i` or `++i`"},ze),je=A("UnaryPostfix",null,{$documentation:"Unary postfix expression, i.e. `i++`"},ze),Ie=A("Binary","left operator right",{$documentation:"Binary expression, i.e. `a + b`",$propdoc:{left:"[AST_Node] left-hand side expression",operator:"[string] the operator",right:"[AST_Node] right-hand side expression"},_walk:function(n){return n._visit(this,function(){this.left._walk(n),this.right._walk(n)})}}),Ue=A("Conditional","condition consequent alternative",{$documentation:"Conditional expression using the ternary operator, i.e. `a ? b : c`",$propdoc:{condition:"[AST_Node]",consequent:"[AST_Node]",alternative:"[AST_Node]"},_walk:function(n){return n._visit(this,function(){this.condition._walk(n),this.consequent._walk(n),this.alternative._walk(n)})}}),Le=A("Assign",null,{$documentation:"An assignment expression — `a = b + 5`"},Ie),Ve=A("Array","elements",{$documentation:"An array literal",$propdoc:{elements:"[AST_Node*] array of elements"},_walk:function(n){return n._visit(this,function(){this.elements.forEach(function(e){e._walk(n)})})}}),We=A("Object","properties",{$documentation:"An object literal",$propdoc:{properties:"[AST_ObjectProperty*] array of properties"},_walk:function(n){return n._visit(this,function(){this.properties.forEach(function(e){e._walk(n)})})}}),Ye=A("ObjectProperty","key value",{$documentation:"Base class for literal object properties",$propdoc:{key:"[string] the property name; it's always a plain string in our AST, no matter if it was a string, number or identifier in original code",value:"[AST_Node] property value.  For setters and getters this is an AST_Function."},_walk:function(n){return n._visit(this,function(){this.value._walk(n)})}}),Xe=A("ObjectKeyVal",null,{$documentation:"A key: value object property"},Ye),Ge=A("ObjectSetter",null,{$documentation:"An object setter property"},Ye),Je=A("ObjectGetter",null,{$documentation:"An object getter property"},Ye),Ke=A("Symbol","scope name thedef",{$propdoc:{name:"[string] name of this symbol",scope:"[AST_Scope/S] the current scope (not necessarily the definition scope)",thedef:"[SymbolDef/S] the definition of this symbol"},$documentation:"Base class for all symbols"}),Ze=A("SymbolAccessor",null,{$documentation:"The name of a property accessor (setter/getter function)"},Ke),Qe=A("SymbolDeclaration","init",{$documentation:"A declaration symbol (symbol in var/const, function name or argument, symbol in catch)",$propdoc:{init:"[AST_Node*/S] array of initializers for this declaration."}},Ke),nt=A("SymbolVar",null,{$documentation:"Symbol defining a variable"},Qe),et=A("SymbolConst",null,{$documentation:"A constant declaration"},Qe),tt=A("SymbolFunarg",null,{$documentation:"Symbol naming a function argument"},nt),it=A("SymbolDefun",null,{$documentation:"Symbol defining a function"},Qe),rt=A("SymbolLambda",null,{$documentation:"Symbol naming a function expression"},Qe),ot=A("SymbolCatch",null,{$documentation:"Symbol naming the exception in catch"},Qe),at=A("Label","references",{$documentation:"Symbol naming a label (declaration)",$propdoc:{references:"[AST_LabelRef*] a list of nodes referring to this label"}},Ke),ut=A("SymbolRef",null,{$documentation:"Reference to some symbol (not definition/declaration)"},Ke),st=A("LabelRef",null,{$documentation:"Reference to a label symbol"},Ke),ct=A("This",null,{$documentation:"The `this` symbol"},Ke),ft=A("Constant",null,{$documentation:"Base class for all constants",getValue:function(){return this.value}}),lt=A("String","value",{$documentation:"A string literal",$propdoc:{value:"[string] the contents of this string"}},ft),pt=A("Number","value",{$documentation:"A number literal",$propdoc:{value:"[number] the numeric value"}},ft),dt=A("RegExp","value",{$documentation:"A regexp literal",$propdoc:{value:"[RegExp] the actual regexp"}},ft),ht=A("Atom",null,{$documentation:"Base class for atoms"},ft),_t=A("Null",null,{$documentation:"The `null` atom",value:null},ht),mt=A("NaN",null,{$documentation:"The impossible value",value:0/0},ht),vt=A("Undefined",null,{$documentation:"The `undefined` value",value:void 0},ht),bt=A("Hole",null,{$documentation:"A hole in an array",value:void 0},ht),yt=A("Infinity",null,{$documentation:"The `Infinity` value",value:1/0},ht),gt=A("Boolean",null,{$documentation:"Base class for booleans"},ht),At=A("False",null,{$documentation:"The `false` atom",value:!1},gt),wt=A("True",null,{$documentation:"The `true` atom",value:!0},gt);E.prototype={_visit:function(n,e){this.stack.push(n);var t=this.visit(n,e?function(){e.call(n)}:l);return!t&&e&&e.call(n),this.stack.pop(),t},parent:function(n){return this.stack[this.stack.length-2-(n||0)]},push:function(n){this.stack.push(n)},pop:function(){return this.stack.pop()},self:function(){return this.stack[this.stack.length-1]},find_parent:function(n){for(var e=this.stack,t=e.length;--t>=0;){var i=e[t];if(i instanceof n)return i}},in_boolean_context:function(){for(var n=this.stack,e=n.length,t=n[--e];e>0;){var i=n[--e];if(i instanceof Ae&&i.condition===t||i instanceof Ue&&i.condition===t||i instanceof te&&i.condition===t||i instanceof oe&&i.condition===t||i instanceof Pe&&"!"==i.operator&&i.expression===t)return!0;if(!(i instanceof Ie)||"&&"!=i.operator&&"||"!=i.operator)return!1;t=i}},loopcontrol_target:function(n){var e=this.stack;if(n)for(var t=e.length;--t>=0;){var i=e[t];if(i instanceof ee&&i.label.name==n.name)return i.body}else for(var t=e.length;--t>=0;){var i=e[t];if(i instanceof we||i instanceof oe||i instanceof ae||i instanceof te)return i}}};var Et="break case catch const continue debugger default delete do else finally for function if in instanceof new return switch throw try typeof var void while with",Dt="false null true",Ft="abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized this throws transient volatile "+Dt+" "+Et,St="return new delete throw else case";Et=b(Et),Ft=b(Ft),St=b(St),Dt=b(Dt);var Ct=b(r("+-*&%=<>!?|~^")),kt=/^0x[0-9a-f]+$/i,Bt=/^0[0-7]+$/,Tt=/^\d*\.?\d*(?:e[+-]?\d*(?:\d\.?|\.?\d)\d*)?$/i,xt=b(["in","instanceof","typeof","new","void","delete","++","--","+","-","!","~","&","|","^","*","/","%",">>","<<",">>>","<",">","<=",">=","==","===","!=","!==","?","=","+=","-=","/=","*=","%=",">>=","<<=",">>>=","|=","^=","&=","&&","||"]),$t=b(r("  \n\r	\f​᠎             　")),Ot=b(r("[{(,.;:")),Mt=b(r("[]{}(),;:")),Nt=b(r("gmsiy")),Rt={letter:new RegExp("[\\u0041-\\u005A\\u0061-\\u007A\\u00AA\\u00B5\\u00BA\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\\u02EE\\u0370-\\u0374\\u0376\\u0377\\u037A-\\u037D\\u0386\\u0388-\\u038A\\u038C\\u038E-\\u03A1\\u03A3-\\u03F5\\u03F7-\\u0481\\u048A-\\u0523\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u05D0-\\u05EA\\u05F0-\\u05F2\\u0621-\\u064A\\u066E\\u066F\\u0671-\\u06D3\\u06D5\\u06E5\\u06E6\\u06EE\\u06EF\\u06FA-\\u06FC\\u06FF\\u0710\\u0712-\\u072F\\u074D-\\u07A5\\u07B1\\u07CA-\\u07EA\\u07F4\\u07F5\\u07FA\\u0904-\\u0939\\u093D\\u0950\\u0958-\\u0961\\u0971\\u0972\\u097B-\\u097F\\u0985-\\u098C\\u098F\\u0990\\u0993-\\u09A8\\u09AA-\\u09B0\\u09B2\\u09B6-\\u09B9\\u09BD\\u09CE\\u09DC\\u09DD\\u09DF-\\u09E1\\u09F0\\u09F1\\u0A05-\\u0A0A\\u0A0F\\u0A10\\u0A13-\\u0A28\\u0A2A-\\u0A30\\u0A32\\u0A33\\u0A35\\u0A36\\u0A38\\u0A39\\u0A59-\\u0A5C\\u0A5E\\u0A72-\\u0A74\\u0A85-\\u0A8D\\u0A8F-\\u0A91\\u0A93-\\u0AA8\\u0AAA-\\u0AB0\\u0AB2\\u0AB3\\u0AB5-\\u0AB9\\u0ABD\\u0AD0\\u0AE0\\u0AE1\\u0B05-\\u0B0C\\u0B0F\\u0B10\\u0B13-\\u0B28\\u0B2A-\\u0B30\\u0B32\\u0B33\\u0B35-\\u0B39\\u0B3D\\u0B5C\\u0B5D\\u0B5F-\\u0B61\\u0B71\\u0B83\\u0B85-\\u0B8A\\u0B8E-\\u0B90\\u0B92-\\u0B95\\u0B99\\u0B9A\\u0B9C\\u0B9E\\u0B9F\\u0BA3\\u0BA4\\u0BA8-\\u0BAA\\u0BAE-\\u0BB9\\u0BD0\\u0C05-\\u0C0C\\u0C0E-\\u0C10\\u0C12-\\u0C28\\u0C2A-\\u0C33\\u0C35-\\u0C39\\u0C3D\\u0C58\\u0C59\\u0C60\\u0C61\\u0C85-\\u0C8C\\u0C8E-\\u0C90\\u0C92-\\u0CA8\\u0CAA-\\u0CB3\\u0CB5-\\u0CB9\\u0CBD\\u0CDE\\u0CE0\\u0CE1\\u0D05-\\u0D0C\\u0D0E-\\u0D10\\u0D12-\\u0D28\\u0D2A-\\u0D39\\u0D3D\\u0D60\\u0D61\\u0D7A-\\u0D7F\\u0D85-\\u0D96\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6\\u0E01-\\u0E30\\u0E32\\u0E33\\u0E40-\\u0E46\\u0E81\\u0E82\\u0E84\\u0E87\\u0E88\\u0E8A\\u0E8D\\u0E94-\\u0E97\\u0E99-\\u0E9F\\u0EA1-\\u0EA3\\u0EA5\\u0EA7\\u0EAA\\u0EAB\\u0EAD-\\u0EB0\\u0EB2\\u0EB3\\u0EBD\\u0EC0-\\u0EC4\\u0EC6\\u0EDC\\u0EDD\\u0F00\\u0F40-\\u0F47\\u0F49-\\u0F6C\\u0F88-\\u0F8B\\u1000-\\u102A\\u103F\\u1050-\\u1055\\u105A-\\u105D\\u1061\\u1065\\u1066\\u106E-\\u1070\\u1075-\\u1081\\u108E\\u10A0-\\u10C5\\u10D0-\\u10FA\\u10FC\\u1100-\\u1159\\u115F-\\u11A2\\u11A8-\\u11F9\\u1200-\\u1248\\u124A-\\u124D\\u1250-\\u1256\\u1258\\u125A-\\u125D\\u1260-\\u1288\\u128A-\\u128D\\u1290-\\u12B0\\u12B2-\\u12B5\\u12B8-\\u12BE\\u12C0\\u12C2-\\u12C5\\u12C8-\\u12D6\\u12D8-\\u1310\\u1312-\\u1315\\u1318-\\u135A\\u1380-\\u138F\\u13A0-\\u13F4\\u1401-\\u166C\\u166F-\\u1676\\u1681-\\u169A\\u16A0-\\u16EA\\u1700-\\u170C\\u170E-\\u1711\\u1720-\\u1731\\u1740-\\u1751\\u1760-\\u176C\\u176E-\\u1770\\u1780-\\u17B3\\u17D7\\u17DC\\u1820-\\u1877\\u1880-\\u18A8\\u18AA\\u1900-\\u191C\\u1950-\\u196D\\u1970-\\u1974\\u1980-\\u19A9\\u19C1-\\u19C7\\u1A00-\\u1A16\\u1B05-\\u1B33\\u1B45-\\u1B4B\\u1B83-\\u1BA0\\u1BAE\\u1BAF\\u1C00-\\u1C23\\u1C4D-\\u1C4F\\u1C5A-\\u1C7D\\u1D00-\\u1DBF\\u1E00-\\u1F15\\u1F18-\\u1F1D\\u1F20-\\u1F45\\u1F48-\\u1F4D\\u1F50-\\u1F57\\u1F59\\u1F5B\\u1F5D\\u1F5F-\\u1F7D\\u1F80-\\u1FB4\\u1FB6-\\u1FBC\\u1FBE\\u1FC2-\\u1FC4\\u1FC6-\\u1FCC\\u1FD0-\\u1FD3\\u1FD6-\\u1FDB\\u1FE0-\\u1FEC\\u1FF2-\\u1FF4\\u1FF6-\\u1FFC\\u2071\\u207F\\u2090-\\u2094\\u2102\\u2107\\u210A-\\u2113\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u212F-\\u2139\\u213C-\\u213F\\u2145-\\u2149\\u214E\\u2183\\u2184\\u2C00-\\u2C2E\\u2C30-\\u2C5E\\u2C60-\\u2C6F\\u2C71-\\u2C7D\\u2C80-\\u2CE4\\u2D00-\\u2D25\\u2D30-\\u2D65\\u2D6F\\u2D80-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u2E2F\\u3005\\u3006\\u3031-\\u3035\\u303B\\u303C\\u3041-\\u3096\\u309D-\\u309F\\u30A1-\\u30FA\\u30FC-\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31B7\\u31F0-\\u31FF\\u3400\\u4DB5\\u4E00\\u9FC3\\uA000-\\uA48C\\uA500-\\uA60C\\uA610-\\uA61F\\uA62A\\uA62B\\uA640-\\uA65F\\uA662-\\uA66E\\uA67F-\\uA697\\uA717-\\uA71F\\uA722-\\uA788\\uA78B\\uA78C\\uA7FB-\\uA801\\uA803-\\uA805\\uA807-\\uA80A\\uA80C-\\uA822\\uA840-\\uA873\\uA882-\\uA8B3\\uA90A-\\uA925\\uA930-\\uA946\\uAA00-\\uAA28\\uAA40-\\uAA42\\uAA44-\\uAA4B\\uAC00\\uD7A3\\uF900-\\uFA2D\\uFA30-\\uFA6A\\uFA70-\\uFAD9\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFB1D\\uFB1F-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40\\uFB41\\uFB43\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uFD50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF21-\\uFF3A\\uFF41-\\uFF5A\\uFF66-\\uFFBE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC]"),non_spacing_mark:new RegExp("[\\u0300-\\u036F\\u0483-\\u0487\\u0591-\\u05BD\\u05BF\\u05C1\\u05C2\\u05C4\\u05C5\\u05C7\\u0610-\\u061A\\u064B-\\u065E\\u0670\\u06D6-\\u06DC\\u06DF-\\u06E4\\u06E7\\u06E8\\u06EA-\\u06ED\\u0711\\u0730-\\u074A\\u07A6-\\u07B0\\u07EB-\\u07F3\\u0816-\\u0819\\u081B-\\u0823\\u0825-\\u0827\\u0829-\\u082D\\u0900-\\u0902\\u093C\\u0941-\\u0948\\u094D\\u0951-\\u0955\\u0962\\u0963\\u0981\\u09BC\\u09C1-\\u09C4\\u09CD\\u09E2\\u09E3\\u0A01\\u0A02\\u0A3C\\u0A41\\u0A42\\u0A47\\u0A48\\u0A4B-\\u0A4D\\u0A51\\u0A70\\u0A71\\u0A75\\u0A81\\u0A82\\u0ABC\\u0AC1-\\u0AC5\\u0AC7\\u0AC8\\u0ACD\\u0AE2\\u0AE3\\u0B01\\u0B3C\\u0B3F\\u0B41-\\u0B44\\u0B4D\\u0B56\\u0B62\\u0B63\\u0B82\\u0BC0\\u0BCD\\u0C3E-\\u0C40\\u0C46-\\u0C48\\u0C4A-\\u0C4D\\u0C55\\u0C56\\u0C62\\u0C63\\u0CBC\\u0CBF\\u0CC6\\u0CCC\\u0CCD\\u0CE2\\u0CE3\\u0D41-\\u0D44\\u0D4D\\u0D62\\u0D63\\u0DCA\\u0DD2-\\u0DD4\\u0DD6\\u0E31\\u0E34-\\u0E3A\\u0E47-\\u0E4E\\u0EB1\\u0EB4-\\u0EB9\\u0EBB\\u0EBC\\u0EC8-\\u0ECD\\u0F18\\u0F19\\u0F35\\u0F37\\u0F39\\u0F71-\\u0F7E\\u0F80-\\u0F84\\u0F86\\u0F87\\u0F90-\\u0F97\\u0F99-\\u0FBC\\u0FC6\\u102D-\\u1030\\u1032-\\u1037\\u1039\\u103A\\u103D\\u103E\\u1058\\u1059\\u105E-\\u1060\\u1071-\\u1074\\u1082\\u1085\\u1086\\u108D\\u109D\\u135F\\u1712-\\u1714\\u1732-\\u1734\\u1752\\u1753\\u1772\\u1773\\u17B7-\\u17BD\\u17C6\\u17C9-\\u17D3\\u17DD\\u180B-\\u180D\\u18A9\\u1920-\\u1922\\u1927\\u1928\\u1932\\u1939-\\u193B\\u1A17\\u1A18\\u1A56\\u1A58-\\u1A5E\\u1A60\\u1A62\\u1A65-\\u1A6C\\u1A73-\\u1A7C\\u1A7F\\u1B00-\\u1B03\\u1B34\\u1B36-\\u1B3A\\u1B3C\\u1B42\\u1B6B-\\u1B73\\u1B80\\u1B81\\u1BA2-\\u1BA5\\u1BA8\\u1BA9\\u1C2C-\\u1C33\\u1C36\\u1C37\\u1CD0-\\u1CD2\\u1CD4-\\u1CE0\\u1CE2-\\u1CE8\\u1CED\\u1DC0-\\u1DE6\\u1DFD-\\u1DFF\\u20D0-\\u20DC\\u20E1\\u20E5-\\u20F0\\u2CEF-\\u2CF1\\u2DE0-\\u2DFF\\u302A-\\u302F\\u3099\\u309A\\uA66F\\uA67C\\uA67D\\uA6F0\\uA6F1\\uA802\\uA806\\uA80B\\uA825\\uA826\\uA8C4\\uA8E0-\\uA8F1\\uA926-\\uA92D\\uA947-\\uA951\\uA980-\\uA982\\uA9B3\\uA9B6-\\uA9B9\\uA9BC\\uAA29-\\uAA2E\\uAA31\\uAA32\\uAA35\\uAA36\\uAA43\\uAA4C\\uAAB0\\uAAB2-\\uAAB4\\uAAB7\\uAAB8\\uAABE\\uAABF\\uAAC1\\uABE5\\uABE8\\uABED\\uFB1E\\uFE00-\\uFE0F\\uFE20-\\uFE26]"),space_combining_mark:new RegExp("[\\u0903\\u093E-\\u0940\\u0949-\\u094C\\u094E\\u0982\\u0983\\u09BE-\\u09C0\\u09C7\\u09C8\\u09CB\\u09CC\\u09D7\\u0A03\\u0A3E-\\u0A40\\u0A83\\u0ABE-\\u0AC0\\u0AC9\\u0ACB\\u0ACC\\u0B02\\u0B03\\u0B3E\\u0B40\\u0B47\\u0B48\\u0B4B\\u0B4C\\u0B57\\u0BBE\\u0BBF\\u0BC1\\u0BC2\\u0BC6-\\u0BC8\\u0BCA-\\u0BCC\\u0BD7\\u0C01-\\u0C03\\u0C41-\\u0C44\\u0C82\\u0C83\\u0CBE\\u0CC0-\\u0CC4\\u0CC7\\u0CC8\\u0CCA\\u0CCB\\u0CD5\\u0CD6\\u0D02\\u0D03\\u0D3E-\\u0D40\\u0D46-\\u0D48\\u0D4A-\\u0D4C\\u0D57\\u0D82\\u0D83\\u0DCF-\\u0DD1\\u0DD8-\\u0DDF\\u0DF2\\u0DF3\\u0F3E\\u0F3F\\u0F7F\\u102B\\u102C\\u1031\\u1038\\u103B\\u103C\\u1056\\u1057\\u1062-\\u1064\\u1067-\\u106D\\u1083\\u1084\\u1087-\\u108C\\u108F\\u109A-\\u109C\\u17B6\\u17BE-\\u17C5\\u17C7\\u17C8\\u1923-\\u1926\\u1929-\\u192B\\u1930\\u1931\\u1933-\\u1938\\u19B0-\\u19C0\\u19C8\\u19C9\\u1A19-\\u1A1B\\u1A55\\u1A57\\u1A61\\u1A63\\u1A64\\u1A6D-\\u1A72\\u1B04\\u1B35\\u1B3B\\u1B3D-\\u1B41\\u1B43\\u1B44\\u1B82\\u1BA1\\u1BA6\\u1BA7\\u1BAA\\u1C24-\\u1C2B\\u1C34\\u1C35\\u1CE1\\u1CF2\\uA823\\uA824\\uA827\\uA880\\uA881\\uA8B4-\\uA8C3\\uA952\\uA953\\uA983\\uA9B4\\uA9B5\\uA9BA\\uA9BB\\uA9BD-\\uA9C0\\uAA2F\\uAA30\\uAA33\\uAA34\\uAA4D\\uAA7B\\uABE3\\uABE4\\uABE6\\uABE7\\uABE9\\uABEA\\uABEC]"),connector_punctuation:new RegExp("[\\u005F\\u203F\\u2040\\u2054\\uFE33\\uFE34\\uFE4D-\\uFE4F\\uFF3F]")};M.prototype.toString=function(){return this.message+" (line: "+this.line+", col: "+this.col+", pos: "+this.pos+")"+"\n\n"+this.stack};var Ht={},qt=b(["typeof","void","delete","--","++","!","~","-","+"]),zt=b(["--","++"]),Pt=b(["=","+=","-=","/=","*=","%=",">>=","<<=",">>>=","|=","^=","&="]),jt=function(n,e){for(var t=0,i=1;t<n.length;++t,++i)for(var r=n[t],o=0;o<r.length;++o)e[r[o]]=i;return e}([["||"],["&&"],["|"],["^"],["&"],["==","===","!=","!=="],["<",">","<=",">=","in","instanceof"],[">>","<<",">>>"],["+","-"],["*","/","%"]],{}),It=t(["for","do","while","switch"]),Ut=t(["atom","num","string","regexp","name"]);z.prototype=new E,function(n){function e(e,t){e.DEFMETHOD("transform",function(e,i){var r,o;return e.push(this),e.before&&(r=e.before(this,t,i)),r===n&&(e.after?(e.stack[e.stack.length-1]=r=this.clone(),t(r,e),o=e.after(r,i),o!==n&&(r=o)):(r=this,t(r,e))),e.pop(),r})}function t(n,e){return L(n,function(n){return n.transform(e,!0)})}e(W,l),e(ee,function(n,e){n.label=n.label.transform(e),n.body=n.body.transform(e)}),e(J,function(n,e){n.body=n.body.transform(e)}),e(K,function(n,e){n.body=t(n.body,e)}),e(te,function(n,e){n.condition=n.condition.transform(e),n.body=n.body.transform(e)}),e(oe,function(n,e){n.init&&(n.init=n.init.transform(e)),n.condition&&(n.condition=n.condition.transform(e)),n.step&&(n.step=n.step.transform(e)),n.body=n.body.transform(e)}),e(ae,function(n,e){n.init=n.init.transform(e),n.object=n.object.transform(e),n.body=n.body.transform(e)}),e(ue,function(n,e){n.expression=n.expression.transform(e),n.body=n.body.transform(e)}),e(_e,function(n,e){n.value&&(n.value=n.value.transform(e))}),e(be,function(n,e){n.label&&(n.label=n.label.transform(e))}),e(Ae,function(n,e){n.condition=n.condition.transform(e),n.body=n.body.transform(e),n.alternative&&(n.alternative=n.alternative.transform(e))}),e(we,function(n,e){n.expression=n.expression.transform(e),n.body=t(n.body,e)}),e(Fe,function(n,e){n.expression=n.expression.transform(e),n.body=t(n.body,e)}),e(Se,function(n,e){n.body=t(n.body,e),n.bcatch&&(n.bcatch=n.bcatch.transform(e)),n.bfinally&&(n.bfinally=n.bfinally.transform(e))}),e(Ce,function(n,e){n.argname=n.argname.transform(e),n.body=t(n.body,e)}),e(Be,function(n,e){n.definitions=t(n.definitions,e)}),e($e,function(n,e){n.value&&(n.value=n.value.transform(e))}),e(fe,function(n,e){n.name&&(n.name=n.name.transform(e)),n.argnames=t(n.argnames,e),n.body=t(n.body,e)}),e(Oe,function(n,e){n.expression=n.expression.transform(e),n.args=t(n.args,e)}),e(Ne,function(n,e){n.car=n.car.transform(e),n.cdr=n.cdr.transform(e)}),e(He,function(n,e){n.expression=n.expression.transform(e)}),e(qe,function(n,e){n.expression=n.expression.transform(e),n.property=n.property.transform(e)}),e(ze,function(n,e){n.expression=n.expression.transform(e)}),e(Ie,function(n,e){n.left=n.left.transform(e),n.right=n.right.transform(e)}),e(Ue,function(n,e){n.condition=n.condition.transform(e),n.consequent=n.consequent.transform(e),n.alternative=n.alternative.transform(e)}),e(Ve,function(n,e){n.elements=t(n.elements,e)}),e(We,function(n,e){n.properties=t(n.properties,e)}),e(Ye,function(n,e){n.value=n.value.transform(e)})}(),P.prototype={unmangleable:function(n){return this.global&&!(n&&n.toplevel)||this.undeclared||!(n&&n.eval)&&(this.scope.uses_eval||this.scope.uses_with)},mangle:function(n){if(!this.mangled_name&&!this.unmangleable(n)){var e=this.scope;this.orig[0]instanceof rt&&!n.screw_ie8&&(e=e.parent_scope),this.mangled_name=e.next_mangled(n)}}},ce.DEFMETHOD("figure_out_scope",function(){var n=this,e=n.parent_scope=null,t=new g,i=0,r=new E(function(n,o){if(n instanceof se){n.init_scope_vars(i);var a=n.parent_scope=e,u=t;return++i,e=n,t=new g,o(),t=u,e=a,--i,!0}if(n instanceof G)return n.scope=e,p(e.directives,n.value),!0;if(n instanceof ue)for(var s=e;s;s=s.parent_scope)s.uses_with=!0;else{if(n instanceof ee){var c=n.label;if(t.has(c.name))throw new Error(d("Label {name} defined twice",c));return t.set(c.name,c),o(),t.del(c.name),!0}if(n instanceof Ke&&(n.scope=e),n instanceof at&&(n.thedef=n,n.init_scope_vars()),n instanceof rt)e.def_function(n);else if(n instanceof it)(n.scope=e.parent_scope).def_function(n);else if(n instanceof nt||n instanceof et){var f=e.def_variable(n);f.constant=n instanceof et,f.init=r.parent().value}else n instanceof ot&&e.def_variable(n);if(n instanceof st){var l=t.get(n.name);if(!l)throw new Error(d("Undefined label {name} [{line},{col}]",{name:n.name,line:n.start.line,col:n.start.col}));n.thedef=l}}});n.walk(r);var o=null,a=n.globals=new g,r=new E(function(e,t){if(e instanceof fe){var i=o;return o=e,t(),o=i,!0}if(e instanceof st)return e.reference(),!0;if(e instanceof ut){var u=e.name,s=e.scope.find_variable(u);if(s)e.thedef=s;else{var c;if(a.has(u)?c=a.get(u):(c=new P(n,a.size(),e),c.undeclared=!0,a.set(u,c)),e.thedef=c,"eval"==u&&r.parent()instanceof Oe)for(var f=e.scope;f&&!f.uses_eval;f=f.parent_scope)f.uses_eval=!0;"arguments"==u&&(o.uses_arguments=!0)}return e.reference(),!0}});n.walk(r)}),se.DEFMETHOD("init_scope_vars",function(n){this.directives=[],this.variables=new g,this.functions=new g,this.uses_with=!1,this.uses_eval=!1,this.parent_scope=null,this.enclosed=[],this.cname=-1,this.nesting=n}),se.DEFMETHOD("strict",function(){return this.has_directive("use strict")}),fe.DEFMETHOD("init_scope_vars",function(){se.prototype.init_scope_vars.apply(this,arguments),this.uses_arguments=!1}),ut.DEFMETHOD("reference",function(){var n=this.definition();n.references.push(this);for(var e=this.scope;e&&(p(e.enclosed,n),e!==n.scope);)e=e.parent_scope;this.frame=this.scope.nesting-n.scope.nesting}),at.DEFMETHOD("init_scope_vars",function(){this.references=[]}),st.DEFMETHOD("reference",function(){this.thedef.references.push(this)}),se.DEFMETHOD("find_variable",function(n){return n instanceof Ke&&(n=n.name),this.variables.get(n)||this.parent_scope&&this.parent_scope.find_variable(n)}),se.DEFMETHOD("has_directive",function(n){return this.parent_scope&&this.parent_scope.has_directive(n)||(this.directives.indexOf(n)>=0?this:null)}),se.DEFMETHOD("def_function",function(n){this.functions.set(n.name,this.def_variable(n))}),se.DEFMETHOD("def_variable",function(n){var e;return this.variables.has(n.name)?(e=this.variables.get(n.name),e.orig.push(n)):(e=new P(this,this.variables.size(),n),this.variables.set(n.name,e),e.global=!this.parent_scope),n.thedef=e}),se.DEFMETHOD("next_mangled",function(n){var e=this.enclosed;n:for(;;){var t=Lt(++this.cname);if(B(t)){for(var i=e.length;--i>=0;){var r=e[i],o=r.mangled_name||r.unmangleable(n)&&r.name;if(t==o)continue n}return t}}}),se.DEFMETHOD("references",function(n){return n instanceof Ke&&(n=n.definition()),this.enclosed.indexOf(n)<0?null:n}),Ke.DEFMETHOD("unmangleable",function(n){return this.definition().unmangleable(n)}),Ze.DEFMETHOD("unmangleable",function(){return!0}),at.DEFMETHOD("unmangleable",function(){return!1}),Ke.DEFMETHOD("unreferenced",function(){return 0==this.definition().references.length&&!(this.scope.uses_eval||this.scope.uses_with)}),Ke.DEFMETHOD("undeclared",function(){return this.definition().undeclared}),st.DEFMETHOD("undeclared",function(){return!1}),at.DEFMETHOD("undeclared",function(){return!1}),Ke.DEFMETHOD("definition",function(){return this.thedef}),Ke.DEFMETHOD("global",function(){return this.definition().global}),ce.DEFMETHOD("_default_mangler_options",function(n){return c(n,{except:[],eval:!1,sort:!1,toplevel:!1,screw_ie8:!1})}),ce.DEFMETHOD("mangle_names",function(n){n=this._default_mangler_options(n);var e=-1,t=[],i=new E(function(r,o){if(r instanceof ee){var a=e;return o(),e=a,!0}if(r instanceof se){var u=(i.parent(),[]);return r.variables.each(function(e){n.except.indexOf(e.name)<0&&u.push(e)}),n.sort&&u.sort(function(n,e){return e.references.length-n.references.length}),t.push.apply(t,u),void 0}if(r instanceof at){var s;do s=Lt(++e);while(!B(s));return r.mangled_name=s,!0}});this.walk(i),t.forEach(function(e){e.mangle(n)})}),ce.DEFMETHOD("compute_char_frequency",function(n){n=this._default_mangler_options(n);var e=new E(function(e){e instanceof ft?Lt.consider(e.print_to_string()):e instanceof me?Lt.consider("return"):e instanceof ve?Lt.consider("throw"):e instanceof ge?Lt.consider("continue"):e instanceof ye?Lt.consider("break"):e instanceof X?Lt.consider("debugger"):e instanceof G?Lt.consider(e.value):e instanceof re?Lt.consider("while"):e instanceof ie?Lt.consider("do while"):e instanceof Ae?(Lt.consider("if"),e.alternative&&Lt.consider("else")):e instanceof Te?Lt.consider("var"):e instanceof xe?Lt.consider("const"):e instanceof fe?Lt.consider("function"):e instanceof oe?Lt.consider("for"):e instanceof ae?Lt.consider("for in"):e instanceof we?Lt.consider("switch"):e instanceof Fe?Lt.consider("case"):e instanceof De?Lt.consider("default"):e instanceof ue?Lt.consider("with"):e instanceof Ge?Lt.consider("set"+e.key):e instanceof Je?Lt.consider("get"+e.key):e instanceof Xe?Lt.consider(e.key):e instanceof Me?Lt.consider("new"):e instanceof ct?Lt.consider("this"):e instanceof Se?Lt.consider("try"):e instanceof Ce?Lt.consider("catch"):e instanceof ke?Lt.consider("finally"):e instanceof Ke&&e.unmangleable(n)?Lt.consider(e.name):e instanceof ze||e instanceof Ie?Lt.consider(e.operator):e instanceof He&&Lt.consider(e.property)});this.walk(e),Lt.sort()});var Lt=function(){function n(){i=Object.create(null),t=r.split("").map(function(n){return n.charCodeAt(0)}),t.forEach(function(n){i[n]=0})}function e(n){var e="",i=54;do e+=String.fromCharCode(t[n%i]),n=Math.floor(n/i),i=64;while(n>0);return e}var t,i,r="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_0123456789";return e.consider=function(n){for(var e=n.length;--e>=0;){var t=n.charCodeAt(e);t in i&&++i[t]}},e.sort=function(){t=_(t,function(n,e){return F(n)&&!F(e)?1:F(e)&&!F(n)?-1:i[e]-i[n]})},e.reset=n,n(),e.get=function(){return t},e.freq=function(){return i},e}();ce.DEFMETHOD("scope_warnings",function(n){n=c(n,{undeclared:!1,unreferenced:!0,assign_to_global:!0,func_arguments:!0,nested_defuns:!0,eval:!0});var e=new E(function(t){if(n.undeclared&&t instanceof ut&&t.undeclared()&&W.warn("Undeclared symbol: {name} [{file}:{line},{col}]",{name:t.name,file:t.start.file,line:t.start.line,col:t.start.col}),n.assign_to_global){var i=null;t instanceof Le&&t.left instanceof ut?i=t.left:t instanceof ae&&t.init instanceof ut&&(i=t.init),i&&(i.undeclared()||i.global()&&i.scope!==i.definition().scope)&&W.warn("{msg}: {name} [{file}:{line},{col}]",{msg:i.undeclared()?"Accidental global?":"Assignment to global",name:i.name,file:i.start.file,line:i.start.line,col:i.start.col})}n.eval&&t instanceof ut&&t.undeclared()&&"eval"==t.name&&W.warn("Eval is used [{file}:{line},{col}]",t.start),n.unreferenced&&(t instanceof Qe||t instanceof at)&&t.unreferenced()&&W.warn("{type} {name} is declared but not referenced [{file}:{line},{col}]",{type:t instanceof at?"Label":"Symbol",name:t.name,file:t.start.file,line:t.start.line,col:t.start.col}),n.func_arguments&&t instanceof fe&&t.uses_arguments&&W.warn("arguments used in function {name} [{file}:{line},{col}]",{name:t.name?t.name.name:"anonymous",file:t.start.file,line:t.start.line,col:t.start.col}),n.nested_defuns&&t instanceof de&&!(e.parent()instanceof se)&&W.warn('Function {name} declared in nested statement "{type}" [{file}:{line},{col}]',{name:t.name.name,type:e.parent().TYPE,file:t.start.file,line:t.start.line,col:t.start.col})});this.walk(e)}),function(){function n(n,e){n.DEFMETHOD("_codegen",e)}function e(n,e){n.DEFMETHOD("needs_parens",e)}function t(n){var e=n.parent();return e instanceof ze?!0:e instanceof Ie&&!(e instanceof Le)?!0:e instanceof Oe&&e.expression===this?!0:e instanceof Ue&&e.condition===this?!0:e instanceof Re&&e.expression===this?!0:void 0}function i(n,e,t){var i=n.length-1;n.forEach(function(n,r){n instanceof Q||(t.indent(),n.print(t),r==i&&e||(t.newline(),e&&t.newline()))})}function r(n,e){n.length>0?e.with_block(function(){i(n,!1,e)}):e.print("{}")}function o(n,e){if(e.option("bracketize"))return d(n.body,e),void 0;if(!n.body)return e.force_semicolon();if(n.body instanceof ie&&e.option("ie_proof"))return d(n.body,e),void 0;for(var t=n.body;;)if(t instanceof Ae){if(!t.alternative)return d(n.body,e),void 0;t=t.alternative}else{if(!(t instanceof ne))break;t=t.body}u(n.body,e)}function a(n,e,t){if(t)try{n.walk(new E(function(n){if(n instanceof Ie&&"in"==n.operator)throw e})),n.print(e)}catch(i){if(i!==e)throw i;n.print(e,!0)}else n.print(e)}function u(n,e){e.option("bracketize")?!n||n instanceof Q?e.print("{}"):n instanceof Z?n.print(e):e.with_block(function(){e.indent(),n.print(e),e.newline()}):!n||n instanceof Q?e.force_semicolon():n.print(e)}function s(n){for(var e=n.stack(),t=e.length,i=e[--t],r=e[--t];t>0;){if(r instanceof Y&&r.body===i)return!0;if(!(r instanceof Ne&&r.car===i||r instanceof Oe&&r.expression===i||r instanceof He&&r.expression===i||r instanceof qe&&r.expression===i||r instanceof Ue&&r.condition===i||r instanceof Ie&&r.left===i||r instanceof je&&r.expression===i))return!1;i=r,r=e[--t]}}function c(n,e){return 0==n.args.length&&!e.option("beautify")}function f(n){for(var e=n[0],t=e.length,i=1;i<n.length;++i)n[i].length<t&&(e=n[i],t=e.length);return e}function p(n){var e,t=n.toString(10),i=[t.replace(/^0\./,".").replace("e+","e")];return Math.floor(n)===n?(n>=0?i.push("0x"+n.toString(16).toLowerCase(),"0"+n.toString(8)):i.push("-0x"+(-n).toString(16).toLowerCase(),"-0"+(-n).toString(8)),(e=/^(.*?)(0+)$/.exec(n))&&i.push(e[1]+"e"+e[2].length)):(e=/^0?\.(0+)(.*)$/.exec(n))&&i.push(e[2]+"e-"+(e[1].length+e[2].length),t.substr(t.indexOf("."))),f(i)}function d(n,e){return n instanceof Z?(n.print(e),void 0):(e.with_block(function(){e.indent(),n.print(e),e.newline()}),void 0)}function h(n,e){n.DEFMETHOD("add_source_map",function(n){e(this,n)})}function _(n,e){e.add_mapping(n.start)}W.DEFMETHOD("print",function(n,e){var t=this,i=t._codegen;n.push_node(t);var r=t.needs_parens(n),o=t instanceof pe&&!n.option("beautify");e||r&&!o?n.with_parens(function(){t.add_comments(n),t.add_source_map(n),i(t,n)}):(t.add_comments(n),r&&o&&n.print("!"),t.add_source_map(n),i(t,n)),n.pop_node()}),W.DEFMETHOD("print_to_string",function(n){var e=j(n);return this.print(e),e.get()}),W.DEFMETHOD("add_comments",function(n){var e=n.option("comments"),t=this;if(e){var i=t.start;if(i&&!i._comments_dumped){i._comments_dumped=!0;var r=i.comments_before;t instanceof _e&&t.value&&t.value.start.comments_before.length>0&&(r=(r||[]).concat(t.value.start.comments_before),t.value.start.comments_before=[]),e.test?r=r.filter(function(n){return e.test(n.value)}):"function"==typeof e&&(r=r.filter(function(n){return e(t,n)})),r.forEach(function(e){"comment1"==e.type?(n.print("//"+e.value+"\n"),n.indent()):"comment2"==e.type&&(n.print("/*"+e.value+"*/"),i.nlb?(n.print("\n"),n.indent()):n.space())})}}}),e(W,function(){return!1}),e(pe,function(n){return s(n)}),e(We,function(n){return s(n)}),e(ze,function(n){var e=n.parent();return e instanceof Re&&e.expression===this}),e(Ne,function(n){var e=n.parent();return e instanceof Oe||e instanceof ze||e instanceof Ie||e instanceof $e||e instanceof He||e instanceof Ve||e instanceof Ye||e instanceof Ue}),e(Ie,function(n){var e=n.parent();if(e instanceof Oe&&e.expression===this)return!0;if(e instanceof ze)return!0;if(e instanceof Re&&e.expression===this)return!0;if(e instanceof Ie){var t=e.operator,i=jt[t],r=this.operator,o=jt[r];if(i>o||i==o&&this===e.right&&(r!=t||"*"!=r&&"&&"!=r&&"||"!=r))return!0}}),e(Re,function(n){var e=n.parent();if(e instanceof Me&&e.expression===this)try{this.walk(new E(function(n){if(n instanceof Oe)throw e}))}catch(t){if(t!==e)throw t;return!0}}),e(Oe,function(n){var e=n.parent();
    return e instanceof Me&&e.expression===this}),e(Me,function(n){var e=n.parent();return c(this,n)&&(e instanceof Re||e instanceof Oe&&e.expression===this)?!0:void 0}),e(pt,function(n){var e=n.parent();return this.getValue()<0&&e instanceof Re&&e.expression===this?!0:void 0}),e(mt,function(n){var e=n.parent();return e instanceof Re&&e.expression===this?!0:void 0}),e(Le,t),e(Ue,t),n(G,function(n,e){e.print_string(n.value),e.semicolon()}),n(X,function(n,e){e.print("debugger"),e.semicolon()}),ne.DEFMETHOD("_do_print_body",function(n){u(this.body,n)}),n(Y,function(n,e){n.body.print(e),e.semicolon()}),n(ce,function(n,e){i(n.body,!0,e),e.print("")}),n(ee,function(n,e){n.label.print(e),e.colon(),n.body.print(e)}),n(J,function(n,e){n.body.print(e),e.semicolon()}),n(Z,function(n,e){r(n.body,e)}),n(Q,function(n,e){e.semicolon()}),n(ie,function(n,e){e.print("do"),e.space(),n._do_print_body(e),e.space(),e.print("while"),e.space(),e.with_parens(function(){n.condition.print(e)}),e.semicolon()}),n(re,function(n,e){e.print("while"),e.space(),e.with_parens(function(){n.condition.print(e)}),e.space(),n._do_print_body(e)}),n(oe,function(n,e){e.print("for"),e.space(),e.with_parens(function(){n.init?(n.init instanceof Be?n.init.print(e):a(n.init,e,!0),e.print(";"),e.space()):e.print(";"),n.condition?(n.condition.print(e),e.print(";"),e.space()):e.print(";"),n.step&&n.step.print(e)}),e.space(),n._do_print_body(e)}),n(ae,function(n,e){e.print("for"),e.space(),e.with_parens(function(){n.init.print(e),e.space(),e.print("in"),e.space(),n.object.print(e)}),e.space(),n._do_print_body(e)}),n(ue,function(n,e){e.print("with"),e.space(),e.with_parens(function(){n.expression.print(e)}),e.space(),n._do_print_body(e)}),fe.DEFMETHOD("_do_print",function(n,e){var t=this;e||n.print("function"),t.name&&(n.space(),t.name.print(n)),n.with_parens(function(){t.argnames.forEach(function(e,t){t&&n.comma(),e.print(n)})}),n.space(),r(t.body,n)}),n(fe,function(n,e){n._do_print(e)}),_e.DEFMETHOD("_do_print",function(n,e){n.print(e),this.value&&(n.space(),this.value.print(n)),n.semicolon()}),n(me,function(n,e){n._do_print(e,"return")}),n(ve,function(n,e){n._do_print(e,"throw")}),be.DEFMETHOD("_do_print",function(n,e){n.print(e),this.label&&(n.space(),this.label.print(n)),n.semicolon()}),n(ye,function(n,e){n._do_print(e,"break")}),n(ge,function(n,e){n._do_print(e,"continue")}),n(Ae,function(n,e){e.print("if"),e.space(),e.with_parens(function(){n.condition.print(e)}),e.space(),n.alternative?(o(n,e),e.space(),e.print("else"),e.space(),u(n.alternative,e)):n._do_print_body(e)}),n(we,function(n,e){e.print("switch"),e.space(),e.with_parens(function(){n.expression.print(e)}),e.space(),n.body.length>0?e.with_block(function(){n.body.forEach(function(n,t){t&&e.newline(),e.indent(!0),n.print(e)})}):e.print("{}")}),Ee.DEFMETHOD("_do_print_body",function(n){this.body.length>0&&(n.newline(),this.body.forEach(function(e){n.indent(),e.print(n),n.newline()}))}),n(De,function(n,e){e.print("default:"),n._do_print_body(e)}),n(Fe,function(n,e){e.print("case"),e.space(),n.expression.print(e),e.print(":"),n._do_print_body(e)}),n(Se,function(n,e){e.print("try"),e.space(),r(n.body,e),n.bcatch&&(e.space(),n.bcatch.print(e)),n.bfinally&&(e.space(),n.bfinally.print(e))}),n(Ce,function(n,e){e.print("catch"),e.space(),e.with_parens(function(){n.argname.print(e)}),e.space(),r(n.body,e)}),n(ke,function(n,e){e.print("finally"),e.space(),r(n.body,e)}),Be.DEFMETHOD("_do_print",function(n,e){n.print(e),n.space(),this.definitions.forEach(function(e,t){t&&n.comma(),e.print(n)});var t=n.parent(),i=t instanceof oe||t instanceof ae,r=i&&t.init===this;r||n.semicolon()}),n(Te,function(n,e){n._do_print(e,"var")}),n(xe,function(n,e){n._do_print(e,"const")}),n($e,function(n,e){if(n.name.print(e),n.value){e.space(),e.print("="),e.space();var t=e.parent(1),i=t instanceof oe||t instanceof ae;a(n.value,e,i)}}),n(Oe,function(n,e){n.expression.print(e),n instanceof Me&&c(n,e)||e.with_parens(function(){n.args.forEach(function(n,t){t&&e.comma(),n.print(e)})})}),n(Me,function(n,e){e.print("new"),e.space(),Oe.prototype._codegen(n,e)}),Ne.DEFMETHOD("_do_print",function(n){this.car.print(n),this.cdr&&(n.comma(),n.should_break()&&(n.newline(),n.indent()),this.cdr.print(n))}),n(Ne,function(n,e){n._do_print(e)}),n(He,function(n,e){var t=n.expression;t.print(e),t instanceof pt&&t.getValue()>=0&&(/[xa-f.]/i.test(e.last())||e.print(".")),e.print("."),e.add_mapping(n.end),e.print_name(n.property)}),n(qe,function(n,e){n.expression.print(e),e.print("["),n.property.print(e),e.print("]")}),n(Pe,function(n,e){var t=n.operator;e.print(t),/^[a-z]/i.test(t)&&e.space(),n.expression.print(e)}),n(je,function(n,e){n.expression.print(e),e.print(n.operator)}),n(Ie,function(n,e){n.left.print(e),e.space(),e.print(n.operator),e.space(),n.right.print(e)}),n(Ue,function(n,e){n.condition.print(e),e.space(),e.print("?"),e.space(),n.consequent.print(e),e.space(),e.colon(),n.alternative.print(e)}),n(Ve,function(n,e){e.with_square(function(){var t=n.elements,i=t.length;i>0&&e.space(),t.forEach(function(n,t){t&&e.comma(),n.print(e)}),i>0&&e.space()})}),n(We,function(n,e){n.properties.length>0?e.with_block(function(){n.properties.forEach(function(n,t){t&&(e.print(","),e.newline()),e.indent(),n.print(e)}),e.newline()}):e.print("{}")}),n(Xe,function(n,e){var t=n.key;e.option("quote_keys")?e.print_string(t+""):("number"==typeof t||!e.option("beautify")&&+t+""==t)&&parseFloat(t)>=0?e.print(p(t)):B(t)?e.print_name(t):e.print_string(t),e.colon(),n.value.print(e)}),n(Ge,function(n,e){e.print("set"),n.value._do_print(e,!0)}),n(Je,function(n,e){e.print("get"),n.value._do_print(e,!0)}),n(Ke,function(n,e){var t=n.definition();e.print_name(t?t.mangled_name||t.name:n.name)}),n(vt,function(n,e){e.print("void 0")}),n(bt,l),n(yt,function(n,e){e.print("1/0")}),n(mt,function(n,e){e.print("0/0")}),n(ct,function(n,e){e.print("this")}),n(ft,function(n,e){e.print(n.getValue())}),n(lt,function(n,e){e.print_string(n.getValue())}),n(pt,function(n,e){e.print(p(n.getValue()))}),n(dt,function(n,e){var t=n.getValue().toString();e.option("ascii_only")&&(t=e.to_ascii(t)),e.print(t);var i=e.parent();i instanceof Ie&&/^in/.test(i.operator)&&i.left===n&&e.print(" ")}),h(W,l),h(G,_),h(X,_),h(Ke,_),h(he,_),h(ne,_),h(ee,l),h(fe,_),h(we,_),h(Ee,_),h(Z,_),h(ce,l),h(Me,_),h(Se,_),h(Ce,_),h(ke,_),h(Be,_),h(ft,_),h(Ye,function(n,e){e.add_mapping(n.start,n.key)})}(),I.prototype=new z,f(I.prototype,{option:function(n){return this.options[n]},warn:function(){this.options.warnings&&W.warn.apply(W,arguments)},before:function(n,e){if(n._squeezed)return n;if(n instanceof se&&(n.drop_unused(this),n=n.hoist_declarations(this)),e(n,this),n=n.optimize(this),n instanceof se){var t=this.options.warnings;this.options.warnings=!1,n.drop_unused(this),this.options.warnings=t}return n._squeezed=!0,n}}),function(){function n(n,e){n.DEFMETHOD("optimize",function(n){var t=this;if(t._optimized)return t;var i=e(t,n);return i._optimized=!0,i===t?i:i.transform(n)})}function e(n,e,t){return t||(t={}),e&&(t.start||(t.start=e.start),t.end||(t.end=e.end)),new n(t)}function t(n,t,i){if(t instanceof W)return t.transform(n);switch(typeof t){case"string":return e(lt,i,{value:t}).optimize(n);case"number":return e(isNaN(t)?mt:pt,i,{value:t}).optimize(n);case"boolean":return e(t?wt:At,i).optimize(n);case"undefined":return e(vt,i).optimize(n);default:if(null===t)return e(_t,i).optimize(n);if(t instanceof RegExp)return e(dt,i).optimize(n);throw new Error(d("Can't handle constant of type: {type}",{type:typeof t}))}}function i(n){if(null===n)return[];if(n instanceof Z)return n.body;if(n instanceof Q)return[];if(n instanceof Y)return[n];throw new Error("Can't convert thing to statement array")}function r(n){return null===n?!0:n instanceof Q?!0:n instanceof Z?0==n.body.length:!1}function u(n){return n instanceof we?n:n instanceof oe||n instanceof ae||n instanceof te?n.body instanceof Z?n.body:n:n}function s(n,t){function r(n){var e=[];return n.reduce(function(n,t){return t instanceof Z?(d=!0,n.push.apply(n,r(t.body))):t instanceof Q?d=!0:t instanceof G?e.indexOf(t.value)<0?(n.push(t),e.push(t.value)):d=!0:n.push(t),n},[])}function o(n,t){var r=t.self(),o=r instanceof fe,a=[];n:for(var s=n.length;--s>=0;){var c=n[s];switch(!0){case o&&c instanceof me&&!c.value&&0==a.length:d=!0;continue n;case c instanceof Ae:if(c.body instanceof me){if((o&&0==a.length||a[0]instanceof me&&!a[0].value)&&!c.body.value&&!c.alternative){d=!0;var f=e(J,c.condition,{body:c.condition});a.unshift(f);continue n}if(a[0]instanceof me&&c.body.value&&a[0].value&&!c.alternative){d=!0,c=c.clone(),c.alternative=a[0],a[0]=c.transform(t);continue n}if((0==a.length||a[0]instanceof me)&&c.body.value&&!c.alternative&&o){d=!0,c=c.clone(),c.alternative=a[0]||e(me,c,{value:e(vt,c)}),a[0]=c.transform(t);continue n}if(!c.body.value&&o){d=!0,c=c.clone(),c.condition=c.condition.negate(t),c.body=e(Z,c,{body:i(c.alternative).concat(a)}),c.alternative=null,a=[c.transform(t)];continue n}if(1==a.length&&o&&a[0]instanceof J&&(!c.alternative||c.alternative instanceof J)){d=!0,a.push(e(me,a[0],{value:e(vt,a[0])}).transform(t)),a=i(c.alternative).concat(a),a.unshift(c);continue n}}var p=l(c.body),_=p instanceof be?t.loopcontrol_target(p.label):null;if(p&&(p instanceof me&&!p.value&&o||p instanceof ge&&r===u(_)||p instanceof ye&&_ instanceof Z&&r===_)){p.label&&h(p.label.thedef.references,p.label),d=!0;var m=i(c.body).slice(0,-1);c=c.clone(),c.condition=c.condition.negate(t),c.body=e(Z,c,{body:a}),c.alternative=e(Z,c,{body:m}),a=[c.transform(t)];continue n}var p=l(c.alternative),_=p instanceof be?t.loopcontrol_target(p.label):null;if(p&&(p instanceof me&&!p.value&&o||p instanceof ge&&r===u(_)||p instanceof ye&&_ instanceof Z&&r===_)){p.label&&h(p.label.thedef.references,p.label),d=!0,c=c.clone(),c.body=e(Z,c.body,{body:i(c.body).concat(a)}),c.alternative=e(Z,c.alternative,{body:i(c.alternative).slice(0,-1)}),a=[c.transform(t)];continue n}a.unshift(c);break;default:a.unshift(c)}}return a}function a(n,e){var t=!1,i=n.length,r=e.self();return n=n.reduce(function(n,i){if(t)c(e,i,n);else{if(i instanceof be){var o=e.loopcontrol_target(i.label);i instanceof ye&&o instanceof Z&&u(o)===r||i instanceof ge&&u(o)===r?i.label&&h(i.label.thedef.references,i.label):n.push(i)}else n.push(i);l(i)&&(t=!0)}return n},[]),d=n.length!=i,n}function s(n,t){function i(){r=Ne.from_array(r),r&&o.push(e(J,r,{body:r})),r=[]}if(n.length<2)return n;var r=[],o=[];return n.forEach(function(n){n instanceof J?r.push(n.body):(i(),o.push(n))}),i(),o=f(o,t),d=o.length!=n.length,o}function f(n,t){function i(n){r.pop();var e=o.body;return e instanceof Ne?e.add(n):e=Ne.cons(e,n),e.transform(t)}var r=[],o=null;return n.forEach(function(n){if(o)if(n instanceof oe){var t={};try{o.body.walk(new E(function(n){if(n instanceof Ie&&"in"==n.operator)throw t})),!n.init||n.init instanceof Be?n.init||(n.init=o.body,r.pop()):n.init=i(n.init)}catch(a){if(a!==t)throw a}}else n instanceof Ae?n.condition=i(n.condition):n instanceof ue?n.expression=i(n.expression):n instanceof _e&&n.value?n.value=i(n.value):n instanceof _e?n.value=i(e(vt,n)):n instanceof we&&(n.expression=i(n.expression));r.push(n),o=n instanceof J?n:null}),r}function p(n){var e=null;return n.reduce(function(n,t){return t instanceof Be&&e&&e.TYPE==t.TYPE?(e.definitions=e.definitions.concat(t.definitions),d=!0):t instanceof oe&&e instanceof Be&&(!t.init||t.init.TYPE==e.TYPE)?(d=!0,n.pop(),t.init?t.init.definitions=e.definitions.concat(t.init.definitions):t.init=e,n.push(t),e=t):(e=t,n.push(t)),n},[])}var d;do d=!1,n=r(n),t.option("dead_code")&&(n=a(n,t)),t.option("if_return")&&(n=o(n,t)),t.option("sequences")&&(n=s(n,t)),t.option("join_vars")&&(n=p(n,t));while(d);return n}function c(n,e,t){n.warn("Dropping unreachable code [{file}:{line},{col}]",e.start),e.walk(new E(function(e){return e instanceof Be?(n.warn("Declarations in unreachable code! [{file}:{line},{col}]",e.start),e.remove_initializers(),t.push(e),!0):e instanceof de?(t.push(e),!0):e instanceof se?!0:void 0}))}function f(n,e){return n.print_to_string().length>e.print_to_string().length?e:n}function l(n){return n&&n.aborts()}function m(n,t){function r(r){r=i(r),n.body instanceof Z?(n.body=n.body.clone(),n.body.body=r.concat(n.body.body.slice(1)),n.body=n.body.transform(t)):n.body=e(Z,n.body,{body:r}).transform(t),m(n,t)}var o=n.body instanceof Z?n.body.body[0]:n.body;o instanceof Ae&&(o.body instanceof ye&&t.loopcontrol_target(o.body.label)===n?(n.condition=n.condition?e(Ie,n.condition,{left:n.condition,operator:"&&",right:o.condition.negate(t)}):o.condition.negate(t),r(o.alternative)):o.alternative instanceof ye&&t.loopcontrol_target(o.alternative.label)===n&&(n.condition=n.condition?e(Ie,n.condition,{left:n.condition,operator:"&&",right:o.condition}):o.condition,r(o.body)))}function v(n,t){return t.option("booleans")&&t.in_boolean_context()?e(wt,n):n}n(W,function(n){return n}),W.DEFMETHOD("equivalent_to",function(n){return this.print_to_string()==n.print_to_string()}),function(n){var e=["!","delete"],t=["in","instanceof","==","!=","===","!==","<","<=",">=",">"];n(W,function(){return!1}),n(Pe,function(){return o(this.operator,e)}),n(Ie,function(){return o(this.operator,t)||("&&"==this.operator||"||"==this.operator)&&this.left.is_boolean()&&this.right.is_boolean()}),n(Ue,function(){return this.consequent.is_boolean()&&this.alternative.is_boolean()}),n(Le,function(){return"="==this.operator&&this.right.is_boolean()}),n(Ne,function(){return this.cdr.is_boolean()}),n(wt,function(){return!0}),n(At,function(){return!0})}(function(n,e){n.DEFMETHOD("is_boolean",e)}),function(n){n(W,function(){return!1}),n(lt,function(){return!0}),n(Pe,function(){return"typeof"==this.operator}),n(Ie,function(n){return"+"==this.operator&&(this.left.is_string(n)||this.right.is_string(n))}),n(Le,function(n){return("="==this.operator||"+="==this.operator)&&this.right.is_string(n)}),n(Ne,function(n){return this.cdr.is_string(n)}),n(Ue,function(n){return this.consequent.is_string(n)&&this.alternative.is_string(n)}),n(Oe,function(n){return n.option("unsafe")&&this.expression instanceof ut&&"String"==this.expression.name&&this.expression.undeclared()})}(function(n,e){n.DEFMETHOD("is_string",e)}),function(n){function e(n){return n._eval()}W.DEFMETHOD("evaluate",function(e){if(!e.option("evaluate"))return[this];try{var i=this._eval(),r=t(e,i,this);return[f(r,this),i]}catch(o){if(o!==n)throw o;return[this]}}),n(Y,function(){throw new Error(d("Cannot evaluate a statement [{file}:{line},{col}]",this.start))}),n(pe,function(){return[this]}),n(W,function(){throw n}),n(ft,function(){return this.getValue()}),n(Pe,function(){var t=this.expression;switch(this.operator){case"!":return!e(t);case"typeof":if(t instanceof pe)return"function";if(t=e(t),t instanceof RegExp)throw n;return typeof t;case"void":return void e(t);case"~":return~e(t);case"-":if(t=e(t),0===t)throw n;return-t;case"+":return+e(t)}throw n}),n(Ie,function(){var t=this.left,i=this.right;switch(this.operator){case"&&":return e(t)&&e(i);case"||":return e(t)||e(i);case"|":return e(t)|e(i);case"&":return e(t)&e(i);case"^":return e(t)^e(i);case"+":return e(t)+e(i);case"*":return e(t)*e(i);case"/":return e(t)/e(i);case"%":return e(t)%e(i);case"-":return e(t)-e(i);case"<<":return e(t)<<e(i);case">>":return e(t)>>e(i);case">>>":return e(t)>>>e(i);case"==":return e(t)==e(i);case"===":return e(t)===e(i);case"!=":return e(t)!=e(i);case"!==":return e(t)!==e(i);case"<":return e(t)<e(i);case"<=":return e(t)<=e(i);case">":return e(t)>e(i);case">=":return e(t)>=e(i);case"in":return e(t)in e(i);case"instanceof":return e(t)instanceof e(i)}throw n}),n(Ue,function(){return e(this.condition)?e(this.consequent):e(this.alternative)}),n(ut,function(){var t=this.definition();if(t&&t.constant&&t.init)return e(t.init);throw n})}(function(n,e){n.DEFMETHOD("_eval",e)}),function(n){function t(n){return e(Pe,n,{operator:"!",expression:n})}n(W,function(){return t(this)}),n(Y,function(){throw new Error("Cannot negate a statement")}),n(pe,function(){return t(this)}),n(Pe,function(){return"!"==this.operator?this.expression:t(this)}),n(Ne,function(n){var e=this.clone();return e.cdr=e.cdr.negate(n),e}),n(Ue,function(n){var e=this.clone();return e.consequent=e.consequent.negate(n),e.alternative=e.alternative.negate(n),f(t(this),e)}),n(Ie,function(n){var e=this.clone(),i=this.operator;if(n.option("unsafe_comps"))switch(i){case"<=":return e.operator=">",e;case"<":return e.operator=">=",e;case">=":return e.operator="<",e;case">":return e.operator="<=",e}switch(i){case"==":return e.operator="!=",e;case"!=":return e.operator="==",e;case"===":return e.operator="!==",e;case"!==":return e.operator="===",e;case"&&":return e.operator="||",e.left=e.left.negate(n),e.right=e.right.negate(n),f(t(this),e);case"||":return e.operator="&&",e.left=e.left.negate(n),e.right=e.right.negate(n),f(t(this),e)}return t(this)})}(function(n,e){n.DEFMETHOD("negate",function(n){return e.call(this,n)})}),function(n){n(W,function(){return!0}),n(Q,function(){return!1}),n(ft,function(){return!1}),n(ct,function(){return!1}),n(K,function(){for(var n=this.body.length;--n>=0;)if(this.body[n].has_side_effects())return!0;return!1}),n(J,function(){return this.body.has_side_effects()}),n(de,function(){return!0}),n(pe,function(){return!1}),n(Ie,function(){return this.left.has_side_effects()||this.right.has_side_effects()}),n(Le,function(){return!0}),n(Ue,function(){return this.condition.has_side_effects()||this.consequent.has_side_effects()||this.alternative.has_side_effects()}),n(ze,function(){return"delete"==this.operator||"++"==this.operator||"--"==this.operator||this.expression.has_side_effects()}),n(ut,function(){return!1}),n(We,function(){for(var n=this.properties.length;--n>=0;)if(this.properties[n].has_side_effects())return!0;return!1}),n(Ye,function(){return this.value.has_side_effects()}),n(Ve,function(){for(var n=this.elements.length;--n>=0;)if(this.elements[n].has_side_effects())return!0;return!1}),n(Re,function(){return!0}),n(Ne,function(){return this.car.has_side_effects()||this.cdr.has_side_effects()})}(function(n,e){n.DEFMETHOD("has_side_effects",e)}),function(n){function e(){var n=this.body.length;return n>0&&l(this.body[n-1])}n(Y,function(){return null}),n(he,function(){return this}),n(Z,e),n(Ee,e),n(Ae,function(){return this.alternative&&l(this.body)&&l(this.alternative)})}(function(n,e){n.DEFMETHOD("aborts",e)}),n(G,function(n){return n.scope.has_directive(n.value)!==n.scope?e(Q,n):n}),n(X,function(n,t){return t.option("drop_debugger")?e(Q,n):n}),n(ee,function(n,t){return n.body instanceof ye&&t.loopcontrol_target(n.body.label)===n.body?e(Q,n):0==n.label.references.length?n.body:n}),n(K,function(n,e){return n.body=s(n.body,e),n}),n(Z,function(n,t){switch(n.body=s(n.body,t),n.body.length){case 1:return n.body[0];case 0:return e(Q,n)}return n}),se.DEFMETHOD("drop_unused",function(n){var t=this;if(n.option("unused")&&!(t instanceof ce)&&!t.uses_eval){var i=[],r=new g,a=this,u=new E(function(n,e){if(n!==t){if(n instanceof de)return r.add(n.name.name,n),!0;if(n instanceof Be&&a===t)return n.definitions.forEach(function(n){n.value&&(r.add(n.name.name,n.value),n.value.has_side_effects()&&n.value.walk(u))}),!0;if(n instanceof ut)return p(i,n.definition()),!0;if(n instanceof se){var o=a;return a=n,e(),a=o,!0}}});t.walk(u);for(var s=0;s<i.length;++s)i[s].orig.forEach(function(n){var e=r.get(n.name);e&&e.forEach(function(n){var e=new E(function(n){n instanceof ut&&p(i,n.definition())});n.walk(e)})});var c=new z(function(r,a,u){if(r instanceof fe)for(var s=r.argnames,f=s.length;--f>=0;){var l=s[f];if(!l.unreferenced())break;s.pop(),n.warn("Dropping unused function argument {name} [{file}:{line},{col}]",{name:l.name,file:l.start.file,line:l.start.line,col:l.start.col})}if(r instanceof de&&r!==t)return o(r.name.definition(),i)?r:(n.warn("Dropping unused function {name} [{file}:{line},{col}]",{name:r.name.name,file:r.name.start.file,line:r.name.start.line,col:r.name.start.col}),e(Q,r));if(r instanceof Be&&!(c.parent()instanceof ae)){var p=r.definitions.filter(function(e){if(o(e.name.definition(),i))return!0;var t={name:e.name.name,file:e.name.start.file,line:e.name.start.line,col:e.name.start.col};return e.value&&e.value.has_side_effects()?(e._unused_side_effects=!0,n.warn("Side effects in initialization of unused variable {name} [{file}:{line},{col}]",t),!0):(n.warn("Dropping unused variable {name} [{file}:{line},{col}]",t),!1)});p=_(p,function(n,e){return!n.value&&e.value?-1:!e.value&&n.value?1:0});for(var d=[],f=0;f<p.length;){var h=p[f];h._unused_side_effects?(d.push(h.value),p.splice(f,1)):(d.length>0&&(d.push(h.value),h.value=Ne.from_array(d),d=[]),++f)}return d=d.length>0?e(Z,r,{body:[e(J,r,{body:Ne.from_array(d)})]}):null,0!=p.length||d?0==p.length?d:(r.definitions=p,d&&(d.body.unshift(r),r=d),r):e(Q,r)}if(r instanceof oe&&r.init instanceof Z){a(r,this);var m=r.init.body.slice(0,-1);return r.init=r.init.body.slice(-1)[0].body,m.push(r),u?L.splice(m):e(Z,r,{body:m})}return r instanceof se&&r!==t?r:void 0});t.transform(c)}}),se.DEFMETHOD("hoist_declarations",function(n){var t=n.option("hoist_funs"),i=n.option("hoist_vars"),r=this;if(t||i){var o=[],u=[],s=new g,c=0,f=0;r.walk(new E(function(n){return n instanceof se&&n!==r?!0:n instanceof Te?(++f,!0):void 0})),i=i&&f>1;var l=new z(function(n){if(n!==r){if(n instanceof G)return o.push(n),e(Q,n);if(n instanceof de&&t)return u.push(n),e(Q,n);if(n instanceof Te&&i){n.definitions.forEach(function(n){s.set(n.name.name,n),++c});var a=n.to_assignments(),f=l.parent();return f instanceof ae&&f.init===n?null==a?n.definitions[0].name:a:f instanceof oe&&f.init===n?a:a?e(J,n,{body:a}):e(Q,n)}if(n instanceof se)return n}});if(r=r.transform(l),c>0){var p=[];if(s.each(function(n,e){r instanceof fe&&a(function(e){return e.name==n.name.name},r.argnames)?s.del(e):(n=n.clone(),n.value=null,p.push(n),s.set(e,n))}),p.length>0){for(var d=0;d<r.body.length;){if(r.body[d]instanceof J){var _,m,v=r.body[d].body;if(v instanceof Le&&"="==v.operator&&(_=v.left)instanceof Ke&&s.has(_.name)){var b=s.get(_.name);if(b.value)break;b.value=v.right,h(p,b),p.push(b),r.body.splice(d,1);continue}if(v instanceof Ne&&(m=v.car)instanceof Le&&"="==m.operator&&(_=m.left)instanceof Ke&&s.has(_.name)){var b=s.get(_.name);if(b.value)break;b.value=m.right,h(p,b),p.push(b),r.body[d].body=v.cdr;continue}}if(r.body[d]instanceof Q)r.body.splice(d,1);else{if(!(r.body[d]instanceof Z))break;var y=[d,1].concat(r.body[d].body);r.body.splice.apply(r.body,y)}}p=e(Te,r,{definitions:p}),u.push(p)}}r.body=o.concat(u,r.body)}return r}),n(J,function(n,t){return t.option("side_effects")&&!n.body.has_side_effects()?(t.warn("Dropping side-effect-free statement [{file}:{line},{col}]",n.start),e(Q,n)):n}),n(te,function(n,t){var i=n.condition.evaluate(t);if(n.condition=i[0],!t.option("loops"))return n;if(i.length>1){if(i[1])return e(oe,n,{body:n.body});if(n instanceof re&&t.option("dead_code")){var r=[];return c(t,n.body,r),e(Z,n,{body:r})}}return n}),n(re,function(n,t){return t.option("loops")?(n=te.prototype.optimize.call(n,t),n instanceof re&&(m(n,t),n=e(oe,n,n).transform(t)),n):n}),n(oe,function(n,t){var i=n.condition;if(i&&(i=i.evaluate(t),n.condition=i[0]),!t.option("loops"))return n;if(i&&i.length>1&&!i[1]&&t.option("dead_code")){var r=[];return n.init instanceof Y?r.push(n.init):n.init&&r.push(e(J,n.init,{body:n.init})),c(t,n.body,r),e(Z,n,{body:r})}return m(n,t),n}),n(Ae,function(n,t){if(!t.option("conditionals"))return n;var i=n.condition.evaluate(t);if(n.condition=i[0],i.length>1)if(i[1]){if(t.warn("Condition always true [{file}:{line},{col}]",n.condition.start),t.option("dead_code")){var o=[];return n.alternative&&c(t,n.alternative,o),o.push(n.body),e(Z,n,{body:o}).transform(t)}}else if(t.warn("Condition always false [{file}:{line},{col}]",n.condition.start),t.option("dead_code")){var o=[];return c(t,n.body,o),n.alternative&&o.push(n.alternative),e(Z,n,{body:o}).transform(t)}r(n.alternative)&&(n.alternative=null);var a=n.condition.negate(t),u=f(n.condition,a)===a;if(n.alternative&&u){u=!1,n.condition=a;var s=n.body;n.body=n.alternative||e(Q),n.alternative=s}if(r(n.body)&&r(n.alternative))return e(J,n.condition,{body:n.condition}).transform(t);if(n.body instanceof J&&n.alternative instanceof J)return e(J,n,{body:e(Ue,n,{condition:n.condition,consequent:n.body.body,alternative:n.alternative.body})}).transform(t);if(r(n.alternative)&&n.body instanceof J)return u?e(J,n,{body:e(Ie,n,{operator:"||",left:a,right:n.body.body})}).transform(t):e(J,n,{body:e(Ie,n,{operator:"&&",left:n.condition,right:n.body.body})}).transform(t);if(n.body instanceof Q&&n.alternative&&n.alternative instanceof J)return e(J,n,{body:e(Ie,n,{operator:"||",left:n.condition,right:n.alternative.body})}).transform(t);if(n.body instanceof _e&&n.alternative instanceof _e&&n.body.TYPE==n.alternative.TYPE)return e(n.body.CTOR,n,{value:e(Ue,n,{condition:n.condition,consequent:n.body.value||e(vt,n.body).optimize(t),alternative:n.alternative.value||e(vt,n.alternative).optimize(t)})}).transform(t);if(n.body instanceof Ae&&!n.body.alternative&&!n.alternative&&(n.condition=e(Ie,n.condition,{operator:"&&",left:n.condition,right:n.body.condition}).transform(t),n.body=n.body.body),l(n.body)&&n.alternative){var p=n.alternative;return n.alternative=null,e(Z,n,{body:[n,p]}).transform(t)}if(l(n.alternative)){var d=n.body;return n.body=n.alternative,n.condition=u?a:n.condition.negate(t),n.alternative=null,e(Z,n,{body:[n,d]}).transform(t)}return n}),n(we,function(n,t){if(0==n.body.length&&t.option("conditionals"))return e(J,n,{body:n.expression}).transform(t);for(;;){var i=n.body[n.body.length-1];if(i){var r=i.body[i.body.length-1];if(r instanceof ye&&u(t.loopcontrol_target(r.label))===n&&i.body.pop(),i instanceof De&&0==i.body.length){n.body.pop();continue}}break}var o=n.expression.evaluate(t);n:if(2==o.length)try{if(n.expression=o[0],!t.option("dead_code"))break n;var a=o[1],s=!1,c=!1,f=!1,p=!1,d=!1,h=new z(function(i,r,o){if(i instanceof fe||i instanceof J)return i;if(i instanceof we&&i===n)return i=i.clone(),r(i,this),d?i:e(Z,i,{body:i.body.reduce(function(n,e){return n.concat(e.body)},[])}).transform(t);if(i instanceof Ae||i instanceof Se){var u=s;return s=!c,r(i,this),s=u,i}if(i instanceof ne||i instanceof we){var u=c;return c=!0,r(i,this),c=u,i}if(i instanceof ye&&this.loopcontrol_target(i.label)===n)return s?(d=!0,i):c?i:(p=!0,o?L.skip:e(Q,i));if(i instanceof Ee&&this.parent()===n){if(p)return L.skip;if(i instanceof Fe){var h=i.expression.evaluate(t);if(h.length<2)throw n;return h[1]===a||f?(f=!0,l(i)&&(p=!0),r(i,this),i):L.skip}return r(i,this),i}});h.stack=t.stack.slice(),n=n.transform(h)}catch(_){if(_!==n)throw _}return n}),n(Fe,function(n,e){return n.body=s(n.body,e),n}),n(Se,function(n,e){return n.body=s(n.body,e),n}),Be.DEFMETHOD("remove_initializers",function(){this.definitions.forEach(function(n){n.value=null})}),Be.DEFMETHOD("to_assignments",function(){var n=this.definitions.reduce(function(n,t){if(t.value){var i=e(ut,t.name,t.name);n.push(e(Le,t,{operator:"=",left:i,right:t.value}))}return n},[]);return 0==n.length?null:Ne.from_array(n)}),n(Be,function(n){return 0==n.definitions.length?e(Q,n):n}),n(pe,function(n,e){return n=fe.prototype.optimize.call(n,e),e.option("unused")&&n.name&&n.name.unreferenced()&&(n.name=null),n}),n(Oe,function(n,t){if(t.option("unsafe")){var i=n.expression;if(i instanceof ut&&i.undeclared())switch(i.name){case"Array":if(1!=n.args.length)return e(Ve,n,{elements:n.args});break;case"Object":if(0==n.args.length)return e(We,n,{properties:[]});break;case"String":return 0==n.args.length?e(lt,n,{value:""}):e(Ie,n,{left:n.args[0],operator:"+",right:e(lt,n,{value:""})});case"Function":if(y(n.args,function(n){return n instanceof lt}))try{var r="(function("+n.args.slice(0,-1).map(function(n){return n.value}).join(",")+"){"+n.args[n.args.length-1].value+"})()",o=q(r);o.figure_out_scope();var a=new I(t.options);o=o.transform(a),o.figure_out_scope(),o.mangle_names();var u=o.body[0].body.expression,s=u.argnames.map(function(t,i){return e(lt,n.args[i],{value:t.print_to_string()})}),r=j();return Z.prototype._codegen.call(u,u,r),r=r.toString().replace(/^\{|\}$/g,""),s.push(e(lt,n.args[n.args.length-1],{value:r})),n.args=s,n}catch(c){c instanceof M?(t.warn("Error parsing code passed to new Function [{file}:{line},{col}]",n.args[n.args.length-1].start),t.warn(c.toString())):console.log(c)}}else if(i instanceof He&&"toString"==i.property&&0==n.args.length)return e(Ie,n,{left:e(lt,n,{value:""}),operator:"+",right:i.expression}).transform(t)}return t.option("side_effects")&&n.expression instanceof pe&&0==n.args.length&&!K.prototype.has_side_effects.call(n.expression)?e(vt,n).transform(t):n}),n(Me,function(n,t){if(t.option("unsafe")){var i=n.expression;if(i instanceof ut&&i.undeclared())switch(i.name){case"Object":case"RegExp":case"Function":case"Error":case"Array":return e(Oe,n,n).transform(t)}}return n}),n(Ne,function(n,e){if(!e.option("side_effects"))return n;if(!n.car.has_side_effects()){var t;if(!(n.cdr instanceof ut&&"eval"==n.cdr.name&&n.cdr.undeclared()&&(t=e.parent())instanceof Oe&&t.expression===n))return n.cdr}if(e.option("cascade")){if(n.car instanceof Le&&!n.car.left.has_side_effects()&&n.car.left.equivalent_to(n.cdr))return n.car;if(!n.car.has_side_effects()&&!n.cdr.has_side_effects()&&n.car.equivalent_to(n.cdr))return n.car}return n}),ze.DEFMETHOD("lift_sequences",function(n){if(n.option("sequences")&&this.expression instanceof Ne){var e=this.expression,t=e.to_array();return this.expression=t.pop(),t.push(this),e=Ne.from_array(t).transform(n)}return this}),n(je,function(n,e){return n.lift_sequences(e)}),n(Pe,function(n,t){n=n.lift_sequences(t);var i=n.expression;if(t.option("booleans")&&t.in_boolean_context()){switch(n.operator){case"!":if(i instanceof Pe&&"!"==i.operator)return i.expression;break;case"typeof":return t.warn("Boolean expression always true [{file}:{line},{col}]",n.start),e(wt,n)}i instanceof Ie&&"!"==n.operator&&(n=f(n,i.negate(t)))}return n.evaluate(t)[0]}),Ie.DEFMETHOD("lift_sequences",function(n){if(n.option("sequences")){if(this.left instanceof Ne){var e=this.left,t=e.to_array();return this.left=t.pop(),t.push(this),e=Ne.from_array(t).transform(n)}if(this.right instanceof Ne&&"||"!=this.operator&&"&&"!=this.operator&&!this.left.has_side_effects()){var e=this.right,t=e.to_array();return this.right=t.pop(),t.push(this),e=Ne.from_array(t).transform(n)}}return this});var A=b("== === != !== * & | ^");n(Ie,function(n,t){function i(e,t){if(t||!n.left.has_side_effects()&&!n.right.has_side_effects()){e&&(n.operator=e);var i=n.left;n.left=n.right,n.right=i}}if(A(n.operator)&&n.right instanceof ft&&!(n.left instanceof ft)&&i(null,!0),n=n.lift_sequences(t),t.option("comparisons"))switch(n.operator){case"===":case"!==":(n.left.is_string(t)&&n.right.is_string(t)||n.left.is_boolean()&&n.right.is_boolean())&&(n.operator=n.operator.substr(0,2));case"==":case"!=":n.left instanceof lt&&"undefined"==n.left.value&&n.right instanceof Pe&&"typeof"==n.right.operator&&t.option("unsafe")&&(n.right.expression instanceof ut&&n.right.expression.undeclared()||(n.right=n.right.expression,n.left=e(vt,n.left).optimize(t),2==n.operator.length&&(n.operator+="=")))}if(t.option("booleans")&&t.in_boolean_context())switch(n.operator){case"&&":var r=n.left.evaluate(t),o=n.right.evaluate(t);if(r.length>1&&!r[1]||o.length>1&&!o[1])return t.warn("Boolean && always false [{file}:{line},{col}]",n.start),e(At,n);if(r.length>1&&r[1])return o[0];if(o.length>1&&o[1])return r[0];break;case"||":var r=n.left.evaluate(t),o=n.right.evaluate(t);if(r.length>1&&r[1]||o.length>1&&o[1])return t.warn("Boolean || always true [{file}:{line},{col}]",n.start),e(wt,n);if(r.length>1&&!r[1])return o[0];if(o.length>1&&!o[1])return r[0];break;case"+":var r=n.left.evaluate(t),o=n.right.evaluate(t);if(r.length>1&&r[0]instanceof lt&&r[1]||o.length>1&&o[0]instanceof lt&&o[1])return t.warn("+ in boolean context always true [{file}:{line},{col}]",n.start),e(wt,n)
    }var a=n.evaluate(t);if(a.length>1&&f(a[0],n)!==n)return a[0];if(t.option("comparisons")){if(!(t.parent()instanceof Ie)||t.parent()instanceof Le){var u=e(Pe,n,{operator:"!",expression:n.negate(t)});n=f(n,u)}switch(n.operator){case"<":i(">");break;case"<=":i(">=")}}return"+"==n.operator&&n.right instanceof lt&&""===n.right.getValue()&&n.left instanceof Ie&&"+"==n.left.operator&&n.left.is_string(t)?n.left:n}),n(ut,function(n,i){if(n.undeclared()){var r=i.option("global_defs");if(r&&r.hasOwnProperty(n.name))return t(i,r[n.name],n);switch(n.name){case"undefined":return e(vt,n);case"NaN":return e(mt,n);case"Infinity":return e(yt,n)}}return n}),n(vt,function(n,t){if(t.option("unsafe")){var i=t.find_parent(se),r=i.find_variable("undefined");if(r){var o=e(ut,n,{name:"undefined",scope:i,thedef:r});return o.reference(),o}}return n});var w=["+","-","/","*","%",">>","<<",">>>","|","^","&"];n(Le,function(n,e){return n=n.lift_sequences(e),"="==n.operator&&n.left instanceof ut&&n.right instanceof Ie&&n.right.left instanceof ut&&n.right.left.name==n.left.name&&o(n.right.operator,w)&&(n.operator=n.right.operator+"=",n.right=n.right.right),n}),n(Ue,function(n,t){if(!t.option("conditionals"))return n;if(n.condition instanceof Ne){var i=n.condition.car;return n.condition=n.condition.cdr,Ne.cons(i,n)}var r=n.condition.evaluate(t);if(r.length>1)return r[1]?(t.warn("Condition always true [{file}:{line},{col}]",n.start),n.consequent):(t.warn("Condition always false [{file}:{line},{col}]",n.start),n.alternative);var o=r[0].negate(t);f(r[0],o)===o&&(n=e(Ue,n,{condition:o,consequent:n.alternative,alternative:n.consequent}));var a=n.consequent,u=n.alternative;return a instanceof Le&&u instanceof Le&&a.operator==u.operator&&a.left.equivalent_to(u.left)&&(n=e(Le,n,{operator:a.operator,left:a.left,right:e(Ue,n,{condition:n.condition,consequent:a.right,alternative:u.right})})),n}),n(gt,function(n,t){if(t.option("booleans")){var i=t.parent();return i instanceof Ie&&("=="==i.operator||"!="==i.operator)?(t.warn("Non-strict equality against boolean: {operator} {value} [{file}:{line},{col}]",{operator:i.operator,value:n.value,file:i.start.file,line:i.start.line,col:i.start.col}),e(pt,n,{value:+n.value})):e(Pe,n,{operator:"!",expression:e(pt,n,{value:1-n.value})})}return n}),n(qe,function(n,t){var i=n.property;return i instanceof lt&&t.option("properties")&&(i=i.getValue(),t.option("screw_ie8")&&Ft(i)||!Ft(i)&&$(i))?e(He,n,{expression:n.expression,property:i}):n}),n(Ve,v),n(We,v),n(dt,v)}(),function(){function n(n){var i="prefix"in n?n.prefix:"UnaryExpression"==n.type?!0:!1;return new(i?Pe:je)({start:e(n),end:t(n),operator:n.operator,expression:r(n.argument)})}function e(n){return new V({file:n.loc&&n.loc.source,line:n.loc&&n.loc.start.line,col:n.loc&&n.loc.start.column,pos:n.start,endpos:n.start})}function t(n){return new V({file:n.loc&&n.loc.source,line:n.loc&&n.loc.end.line,col:n.loc&&n.loc.end.column,pos:n.end,endpos:n.end})}function i(n,i,a){var u="function From_Moz_"+n+"(M){\n";return u+="return new mytype({\nstart: my_start_token(M),\nend: my_end_token(M)",a&&a.split(/\s*,\s*/).forEach(function(n){var e=/([a-z0-9$_]+)(=|@|>|%)([a-z0-9$_]+)/i.exec(n);if(!e)throw new Error("Can't understand property map: "+n);var t="M."+e[1],i=e[2],r=e[3];if(u+=",\n"+r+": ","@"==i)u+=t+".map(from_moz)";else if(">"==i)u+="from_moz("+t+")";else if("="==i)u+=t;else{if("%"!=i)throw new Error("Can't understand operator in propmap: "+n);u+="from_moz("+t+").body"}}),u+="\n})}",u=new Function("mytype","my_start_token","my_end_token","from_moz","return("+u+")")(i,e,t,r),o[n]=u}function r(n){a.push(n);var e=null!=n?o[n.type](n):null;return a.pop(),e}var o={TryStatement:function(n){return new Se({start:e(n),end:t(n),body:r(n.block).body,bcatch:r(n.handlers[0]),bfinally:n.finalizer?new ke(r(n.finalizer)):null})},CatchClause:function(n){return new Ce({start:e(n),end:t(n),argname:r(n.param),body:r(n.body).body})},ObjectExpression:function(n){return new We({start:e(n),end:t(n),properties:n.properties.map(function(n){var i=n.key,o="Identifier"==i.type?i.name:i.value,a={start:e(i),end:t(n.value),key:o,value:r(n.value)};switch(n.kind){case"init":return new Xe(a);case"set":return a.value.name=r(i),new Ge(a);case"get":return a.value.name=r(i),new Je(a)}})})},SequenceExpression:function(n){return Ne.from_array(n.expressions.map(r))},MemberExpression:function(n){return new(n.computed?qe:He)({start:e(n),end:t(n),property:n.computed?r(n.property):n.property.name,expression:r(n.object)})},SwitchCase:function(n){return new(n.test?Fe:De)({start:e(n),end:t(n),expression:r(n.test),body:n.consequent.map(r)})},Literal:function(n){var i=n.value,r={start:e(n),end:t(n)};if(null===i)return new _t(r);switch(typeof i){case"string":return r.value=i,new lt(r);case"number":return r.value=i,new pt(r);case"boolean":return new(i?wt:At)(r);default:return r.value=i,new dt(r)}},UnaryExpression:n,UpdateExpression:n,Identifier:function(n){var i=a[a.length-2];return new("this"==n.name?ct:"LabeledStatement"==i.type?at:"VariableDeclarator"==i.type&&i.id===n?"const"==i.kind?et:nt:"FunctionExpression"==i.type?i.id===n?rt:tt:"FunctionDeclaration"==i.type?i.id===n?it:tt:"CatchClause"==i.type?ot:"BreakStatement"==i.type||"ContinueStatement"==i.type?st:ut)({start:e(n),end:t(n),name:n.name})}};i("Node",W),i("Program",ce,"body@body"),i("Function",pe,"id>name, params@argnames, body%body"),i("EmptyStatement",Q),i("BlockStatement",Z,"body@body"),i("ExpressionStatement",J,"expression>body"),i("IfStatement",Ae,"test>condition, consequent>body, alternate>alternative"),i("LabeledStatement",ee,"label>label, body>body"),i("BreakStatement",ye,"label>label"),i("ContinueStatement",ge,"label>label"),i("WithStatement",ue,"object>expression, body>body"),i("SwitchStatement",we,"discriminant>expression, cases@body"),i("ReturnStatement",me,"argument>value"),i("ThrowStatement",ve,"argument>value"),i("WhileStatement",re,"test>condition, body>body"),i("DoWhileStatement",ie,"test>condition, body>body"),i("ForStatement",oe,"init>init, test>condition, update>step, body>body"),i("ForInStatement",ae,"left>init, right>object, body>body"),i("DebuggerStatement",X),i("FunctionDeclaration",de,"id>name, params@argnames, body%body"),i("VariableDeclaration",Te,"declarations@definitions"),i("VariableDeclarator",$e,"id>name, init>value"),i("ThisExpression",ct),i("ArrayExpression",Ve,"elements@elements"),i("FunctionExpression",pe,"id>name, params@argnames, body%body"),i("BinaryExpression",Ie,"operator=operator, left>left, right>right"),i("AssignmentExpression",Le,"operator=operator, left>left, right>right"),i("LogicalExpression",Ie,"operator=operator, left>left, right>right"),i("ConditionalExpression",Ue,"test>condition, consequent>consequent, alternate>alternative"),i("NewExpression",Me,"callee>expression, arguments@args"),i("CallExpression",Oe,"callee>expression, arguments@args");var a=null;W.from_mozilla_ast=function(n){var e=a;a=[];var t=r(n);return a=e,t}}(),n.array_to_hash=t,n.slice=i,n.characters=r,n.member=o,n.find_if=a,n.repeat_string=u,n.DefaultsError=s,n.defaults=c,n.merge=f,n.noop=l,n.MAP=L,n.push_uniq=p,n.string_template=d,n.remove=h,n.mergeSort=_,n.set_difference=m,n.set_intersection=v,n.makePredicate=b,n.all=y,n.Dictionary=g,n.DEFNODE=A,n.AST_Token=V,n.AST_Node=W,n.AST_Statement=Y,n.AST_Debugger=X,n.AST_Directive=G,n.AST_SimpleStatement=J,n.walk_body=w,n.AST_Block=K,n.AST_BlockStatement=Z,n.AST_EmptyStatement=Q,n.AST_StatementWithBody=ne,n.AST_LabeledStatement=ee,n.AST_DWLoop=te,n.AST_Do=ie,n.AST_While=re,n.AST_For=oe,n.AST_ForIn=ae,n.AST_With=ue,n.AST_Scope=se,n.AST_Toplevel=ce,n.AST_Lambda=fe,n.AST_Accessor=le,n.AST_Function=pe,n.AST_Defun=de,n.AST_Jump=he,n.AST_Exit=_e,n.AST_Return=me,n.AST_Throw=ve,n.AST_LoopControl=be,n.AST_Break=ye,n.AST_Continue=ge,n.AST_If=Ae,n.AST_Switch=we,n.AST_SwitchBranch=Ee,n.AST_Default=De,n.AST_Case=Fe,n.AST_Try=Se,n.AST_Catch=Ce,n.AST_Finally=ke,n.AST_Definitions=Be,n.AST_Var=Te,n.AST_Const=xe,n.AST_VarDef=$e,n.AST_Call=Oe,n.AST_New=Me,n.AST_Seq=Ne,n.AST_PropAccess=Re,n.AST_Dot=He,n.AST_Sub=qe,n.AST_Unary=ze,n.AST_UnaryPrefix=Pe,n.AST_UnaryPostfix=je,n.AST_Binary=Ie,n.AST_Conditional=Ue,n.AST_Assign=Le,n.AST_Array=Ve,n.AST_Object=We,n.AST_ObjectProperty=Ye,n.AST_ObjectKeyVal=Xe,n.AST_ObjectSetter=Ge,n.AST_ObjectGetter=Je,n.AST_Symbol=Ke,n.AST_SymbolAccessor=Ze,n.AST_SymbolDeclaration=Qe,n.AST_SymbolVar=nt,n.AST_SymbolConst=et,n.AST_SymbolFunarg=tt,n.AST_SymbolDefun=it,n.AST_SymbolLambda=rt,n.AST_SymbolCatch=ot,n.AST_Label=at,n.AST_SymbolRef=ut,n.AST_LabelRef=st,n.AST_This=ct,n.AST_Constant=ft,n.AST_String=lt,n.AST_Number=pt,n.AST_RegExp=dt,n.AST_Atom=ht,n.AST_Null=_t,n.AST_NaN=mt,n.AST_Undefined=vt,n.AST_Hole=bt,n.AST_Infinity=yt,n.AST_Boolean=gt,n.AST_False=At,n.AST_True=wt,n.TreeWalker=E,n.KEYWORDS=Et,n.KEYWORDS_ATOM=Dt,n.RESERVED_WORDS=Ft,n.KEYWORDS_BEFORE_EXPRESSION=St,n.OPERATOR_CHARS=Ct,n.RE_HEX_NUMBER=kt,n.RE_OCT_NUMBER=Bt,n.RE_DEC_NUMBER=Tt,n.OPERATORS=xt,n.WHITESPACE_CHARS=$t,n.PUNC_BEFORE_EXPRESSION=Ot,n.PUNC_CHARS=Mt,n.REGEXP_MODIFIERS=Nt,n.UNICODE=Rt,n.is_letter=D,n.is_digit=F,n.is_alphanumeric_char=S,n.is_unicode_combining_mark=C,n.is_unicode_connector_punctuation=k,n.is_identifier=B,n.is_identifier_start=T,n.is_identifier_char=x,n.is_identifier_string=$,n.parse_js_number=O,n.JS_Parse_Error=M,n.js_error=N,n.is_token=R,n.EX_EOF=Ht,n.tokenizer=H,n.UNARY_PREFIX=qt,n.UNARY_POSTFIX=zt,n.ASSIGNMENT=Pt,n.PRECEDENCE=jt,n.STATEMENTS_WITH_LABELS=It,n.ATOMIC_START_TOKEN=Ut,n.parse=q,n.TreeTransformer=z,n.SymbolDef=P,n.base54=Lt,n.OutputStream=j,n.Compressor=I,n.SourceMap=U}({},function(){return this}());
    /*
    //@ sourceMappingURL=uglify.js.map
    */
  provide("bookmarkleteer-browser/uglify", module.exports);
}(global));

// pakmanager:bookmarkleteer-browser
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  window.jQuery(function () {
      "use strict";
    
       require('bookmarkleteer-browser/uglify');
      var $ = window.jQuery
        , $events = $('body')
        //, UglifyJS = require('uglify-js')
        , UglifyJS = window.UglifyJS
        , serializeForm = require('serialize-form').serializeFormObject
        ;
    
      function uglify(code) {
        var ast
          , compressor
          ;
    
        ast = UglifyJS.parse(code);
        ast.figure_out_scope();
        compressor = UglifyJS.Compressor();
        ast = ast.transform(compressor);
        code = ast.print_to_string();
    
        return code;
      }
    
      function bookmarkletify(code) {
        code = uglify(code);
        code = encodeURIComponent(code);
        return code;
      }
    
      function onSubmit(ev) {
        var data
          , min
          , usestrict = ""
          ;
    
        console.log('submit');
        ev.preventDefault();
        ev.stopPropagation();
        data = serializeForm('form.js-script');
    
        if (data.usestrict) {
          usestrict = "'use strict';";
        }
        min = bookmarkletify('(function(){' + usestrict + data.raw + '}());');
        console.log('data', data, min);
      
        function onCreate() {
          /*jshint scripturl:true*/
          $('.js-bookmarklet-container').slideDown();
          $('a.js-bookmarklet').attr('href', 'javascript:' + min);
          $('a.js-bookmarklet').text(data.name);
        }
    
        $.ajax({
          url: '/scripts'
        , method: 'POST'
        , contentType: 'application/json'
        , data: JSON.stringify(data)
        , success: onCreate
        });
      }
    
      function onShareIt(ev) {
        console.log('show share');
        ev.preventDefault();
        ev.stopPropagation();
    
        $('.js-share-container').slideDown();
      }
    
      $('.js-test-container').hide();
      $('.js-share-container').hide();
      $('.js-bookmarklet-container').hide();
    
      $events.on('submit', 'form.js-script', onSubmit);
      $events.on('click', '.js-share-it', onShareIt);
    });
    
  provide("bookmarkleteer-browser", module.exports);
}(global));