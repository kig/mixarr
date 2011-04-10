Array.from = function(o) {
  var a = [];
  for (var i=0; i<o.length; i++)
    a.push(o[i]);
  return a;
}
Array.prototype.has = function(v) { return this.indexOf(v) != -1; }
Array.prototype.random = function() { return this[randomInt(this.length)]; }

castToInt = function(o) {
  if (typeof o == 'number')
    return isNaN(o) ? 0 : Math.floor(o);
  if (o == true) return 1;
  return 0;
};

// Creates a constant checker / generator from its arguments.
//
// E.g. if you want a constant checker for the constants 1, 2, and 3, you
// would do the following:
//
//   var cc = constCheck(1,2,3);
//   var randomConst = cc.random();
//   if (cc.has(randomConst))
//     console.log("randomConst is included in cc's constants");
//
constCheck = function() {
  var a = Array.from(arguments);
  a.has = function(v) { return this.indexOf(castToInt(v)) != -1; };
  return a;
};

Tests = {
  autorun : true,
  message : null,
  delay : 0,

  startUnit : function(){ return []; },
  setup : function() { return arguments; },
  teardown : function() {},
  endUnit : function() {}
};

var __testSuccess__ = true;
var __testLog__;
var __backlog__ = [];

Object.toSource = function(a, seen){
  if (a == null) return "null";
  if (typeof a == 'boolean') return a ? "true" : "false";
  if (typeof a == 'string') return '"' + a.replace(/"/g, '\\"') + '"';
  if (a instanceof HTMLElement) return a.toString();
  if (a.width && a.height && a.data) return "[ImageData]";
  if (a instanceof Array) {
    if (!seen) seen = [];
    var idx = seen.indexOf(a);
    if (idx != -1) return '#'+(idx+1)+'#';
    seen.unshift(a);
    var srcs = a.map(function(o){ return Object.toSource(o,seen) });
    var prefix = '';
    idx = seen.indexOf(a);
    if (idx != -1) prefix = '#'+(idx+1)+'=';
    return prefix + '[' + srcs.join(", ") + ']';
  }
  if (typeof a == 'object') {
    if (!seen) seen = [];
    var idx = seen.indexOf(a);
    if (idx != -1) return '#'+(idx+1)+'#';
    seen.unshift(a);
    var members = [];
    var name;
    try {
      for (var i in a) {
        if (i.search(/^[a-zA-Z0-9]+$/) != -1)
          name = i;
        else
          name = '"' + i.replace(/"/g, '\\"') + '"';
        var ai;
        try { ai = a[i]; }
        catch(e) { ai = 'null /*ERROR_ACCESSING*/'; }
        var s = name + ':' + Object.toSource(ai, seen);
        members.push(s);
      }
    } catch (e) {}
    var prefix = '';
    idx = seen.indexOf(a);
    if (idx != -1) prefix = '#'+(idx+1)+'=';
    return prefix + '{' + members.join(", ") + '}'
  }
  if (typeof a == 'function')
    return '('+a.toString().replace(/\n/g, " ").replace(/\s+/g, " ")+')';
  return a.toString();
}

function formatError(e) {
  if (window.console) console.log(e);
  var pathSegs = location.href.toString().split("/");
  var currentDoc = e.lineNumber != null ? pathSegs[pathSegs.length - 1] : null;
  var trace = (e.filename || currentDoc) + ":" + e.lineNumber + (e.trace ? "\n"+e.trace : "");
  return e.message + "\n" + trace;
}

function runTests() {
  var h = document.getElementById('test-status');
  if (h == null) {
    h = document.createElement('h1');
    h.id = 'test-status';
    document.body.appendChild(h);
  }
  h.textContent = "";
  var log = document.getElementById('test-log');
  if (log == null) {
    log = document.createElement('div');
    log.id = 'test-log';
    document.body.appendChild(log);
  }
  while (log.childNodes.length > 0)
    log.removeChild(log.firstChild);

  var setup_args = [];
    
  if (Tests.startUnit != null) {
    __testLog__ = document.createElement('div');
    try {
      setup_args = Tests.startUnit();
      if (__testLog__.childNodes.length > 0)
        log.appendChild(__testLog__);
    } catch(e) {
      testFailed("startUnit", formatError(e));
      log.appendChild(__testLog__);
      printTestStatus();
      return;
    }
  }

  var testsRun = false;
  
  for (var i in Tests) {
    if (i.substring(0,4) != "test") continue;
    __testLog__ = document.createElement('div');
    __testSuccess__ = true;
    try {
      doTestNotify (i);
      var args = setup_args;
      if (Tests.setup != null)
        args = Tests.setup.apply(Tests, setup_args);
      Tests[i].apply(Tests, args);
      if (Tests.teardown != null)
        Tests.teardown.apply(Tests, args);
    }
    catch (e) {
      testFailed(i, e.name, formatError(e));
    }
    if (__testSuccess__ == false) {
      var h = document.createElement('h2');
      h.textContent = i;
      __testLog__.insertBefore(h, __testLog__.firstChild);
      log.appendChild(__testLog__);
    }
    doTestNotify (i+"--"+(__testSuccess__?"OK":"FAIL"));
    testsRun = true;
  }
  
  printTestStatus(testsRun);
  if (Tests.endUnit != null) {
    __testLog__ = document.createElement('div');
    try {
      Tests.endUnit.apply(Tests, setup_args);
      if (__testLog__.childNodes.length > 0)
        log.appendChild(__testLog__);
    } catch(e) {
      testFailed("endUnit", e.name, formatError(e));
      log.appendChild(__testLog__);
    }
  }
}

function doTestNotify(name) {
  if (!Tests || !Tests.remoteNotify) return;
  try {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "http://localhost:8888/"+name, true);
    xhr.send(null);
  } catch(e) {}
}

function testFailed(assertName, name) {
  var d = document.createElement('div');
  var h = document.createElement('h3');
  h.textContent = name==null ? assertName : name + " (in " + assertName + ")";
  d.appendChild(h);
  var args = []
  for (var i=2; i<arguments.length; i++) {
    var a = arguments[i];
    var p = document.createElement('p');
    p.style.whiteSpace = 'pre';
    p.textContent = (a == null) ? "null" :
                    (typeof a == 'boolean' || typeof a == 'string') ? a : Object.toSource(a);
    args.push(p.textContent);
    d.appendChild(p);
  }
  __testLog__.appendChild(d);
  __testSuccess__ = false;
  doTestNotify([assertName, name].concat(args).join("--"));
}

function checkTestSuccess() {
  var log = document.getElementById('test-log');
  return (log.childNodes.length == 0)
}

window.addEventListener('load', function(){
  for (var i=0; i<__backlog__.length; i++)
    log(__backlog__[i]);
}, false);

function log(msg) {
  var p = document.createElement('p');
  var a = [];
  for (var i=0; i<arguments.length; i++)
    a.push(arguments[i]);
  p.textContent = a.join(", ");
  if (!__testLog__) {
    if (document.body)
      document.body.appendChild(p);
    else
      __backlog__.push(msg);
  } else {
    __testLog__.appendChild(p);
  }
}

function printTestStatus(testsRun) {
  var status = document.getElementById('test-status');
  if (testsRun) {
    document.body.className = checkTestSuccess() ? 'ok' : 'fail';
    document.title = status.textContent = checkTestSuccess() ? "OK" : "FAIL";
  } else {
    document.body.className = 'fail';
    document.title = status.textContent = "NO TESTS FOUND";
  }
}

function assertFail(name, f) {
  if (f == null) { f = name; name = null; }
  var r = false;
  try { f(); } catch(e) { r=true; }
  if (!r) {
    testFailed("assertFail", name, f);
    return false;
  } else {
    return true;
  }
}

function assertOk(name, f) {
  if (f == null) { f = name; name = null; }
  var r = false;
  var err;
  try { f(); r=true; } catch(e) { err = e; }
  if (!r) {
    testFailed("assertOk", name, f, err.toString());
    return false;
  } else {
    return true;
  }
}

function assert(name, v) {
  if (v == null) { v = name; name = null; }
  if (!v) {
    testFailed("assert", name, v)
    return false;
  } else {
    return true;
  }
}

function assertProperty(name, v, p) {
  if (p == null) { p = v; v = name; name = p; }
  if (v[p] == null) {
    testFailed("assertProperty", name)
    return false;
  } else {
    return true;
  }
}

function compare(a,b) {
  if (typeof a == 'number' && typeof b == 'number') {
    return a == b || (isNaN(a) && isNaN(b));
  } else {
    return Object.toSource(a) == Object.toSource(b);
  }
}

function assertEquals(name, v, p) {
  if (p == null) { p = v; v = name; name = null; }
  if (!compare(v, p)) {
    testFailed("assertEquals", name, v, p)
    return false;
  } else {
    return true;
  }
}

function assertNotEquals(name, v, p) {
  if (p == null) { p = v; v = name; name = null; }
  if (compare(v, p)) {
    testFailed("assertNotEquals", name, v, p)
    return false;
  } else {
    return true;
  }
}

function time(elementId, f) {
    var s = document.getElementById(elementId);
    var t0 = new Date().getTime();
    f();
    var t1 = new Date().getTime();
    s.textContent = 'Elapsed: '+(t1-t0)+' ms';
}

function randomFloat () {
    var fac = 1.0;
    var r = Math.random();
    if (r < 0.25)
        fac = 10;
    else if (r < 0.4)
        fac = 100;
    else if (r < 0.5)
        fac = 1000;
    else if (r < 0.6)
        fac = 100000;
    else if (r < 0.7)
        fac = 10000000000;
    else if (r < 0.8)
        fac = NaN;
    return -0.5*fac + Math.random() * fac;
};
function randomFloatFromRange(lo, hi) {
  var r = Math.random();
  if (r < 0.05)
    return lo;
  else if (r > 0.95)
    return hi;
  else
    return lo + Math.random()*(hi-lo);
};
function randomInt (sz) {
  if (sz != null)
    return Math.floor(Math.random()*sz);
  else
    return Math.floor(randomFloat());
};
function randomIntFromRange(lo, hi) {
  return Math.floor(randomFloatFromRange(lo, hi));
};
function randomLength () {
    var l = Math.floor(Math.random() * 256);
    if (Math.random < 0.5) l = l / 10;
    if (Math.random < 0.3) l = l / 10;
    return l;
};
function randomSmallIntArray () {
    var l = randomLength();
    var s = new Array(l);
    for (var i=0; i<l; i++)
        s[i] = Math.floor(Math.random() * 256)-1;
    return s;
};
function randomFloatArray () {
    var l = randomLength();
    var s = new Array(l);
    for (var i=0; i<l; i++)
        s[i] = randomFloat();
    return s;
}
function randomIntArray () {
    var l = randomLength();
    var s = new Array(l);
    for (var i=0; i<l; i++)
        s[i] = randomFloat();
    return s;
}
function randomMixedArray () {
    var l = randomLength();
    var s = new Array(l);
    for (var i=0; i<l; i++)
        s[i] = randomNonArray();
    return s;
}
function randomArray () {
    var r = Math.random();
    if (r < 0.3)
        return randomFloatArray();
    else if (r < 0.6)
        return randomIntArray();
    else if (r < 0.8)
        return randomSmallIntArray();
    else
        return randomMixedArray();
}
function randomString () {
    return String.fromCharCode.apply(String, randomSmallIntArray());
}

TypedArrayTypes = [
  Float32Array,
  Int32Array,
  Int16Array,
  Int8Array,
  Uint32Array,
  Uint16Array,
  Uint8Array
];
typedArrayContentGenerators = [randomLength, randomSmallIntArray];
randomTypedArray = function() {
  var t = TypedArrayTypes.random();
  return new t(typedArrayContentGenerators.random()());
};

randomArrayBuffer = function(buflen) {
  if (buflen == null) buflen = 256;
  var len = randomInt(buflen)+1;
  var rv;
  try {
    rv = new ArrayBuffer(len);
  } catch(e) {
    log("Error creating ArrayBuffer with length " + len);
    throw(e);
  }
  return rv;
};

randomSmallTypedArray = function(buflen) {
  var t = TypedArrayTypes.random();
  return new t(randomInt(buflen/4)+1);
};

randomColor = function() {
  return [Math.random(), Math.random(), Math.random(), Math.random()];
};

randomName = function() {
  var arr = [];
  var len = randomLength()+1;
  for (var i=0; i<len; i++) {
    var l = randomInt(255)+1;
    var h = randomInt(255)+1;
    var c = (h << 8) | l;
    arr.push(String.fromCharCode(c));
  }
  return arr.join('');
};

randomBool = function() { return Math.random() > 0.5; };

randomImage = function(w,h) {
  var img;
  var r = Math.random();
  if (r < 0.5) {
    img = document.createElement('canvas');
    img.width = w; img.height = h;
    img.getContext('2d').fillRect(0,0,w,h);
  } else if (r < 0.5) {
    img = document.createElement('video');
    img.width = w; img.height = h;
  } else if (r < 0.75) {
    img = document.createElement('img');
    img.width = w; img.height = h;
  } else {
    img = canvas2D.getContext('2d').createImageData(w,h);
  }
  return img;
};

function randomNonArray() {
    var r = Math.random();
    if (r < 0.25) {
        return randomFloat();
    } else if (r < 0.6) {
        return randomInt();
    } else if (r < 0.7) {
        return (r < 0.65);
    } else if (r < 0.87) {
        return randomString();
    } else {
        return null;
    }
}

function generateRandomArg(pos, count) {
    if (pos == 0 && Math.random() < 0.5)
        return randomGLConstant();
    if (pos == count-1 && Math.random() < 0.25)
        if (Math.random() < 0.5)
            return randomString();
        else
            return randomArray();
    var r = Math.random();
    if (r < 0.25) {
        return randomFloat();
    } else if (r < 0.6) {
        return randomInt();
    } else if (r < 0.7) {
        return (r < 0.65);
    } else if (r < 0.77) {
        return randomString();
    } else if (r < 0.84) {
        return randomArray();
    } else {
        return null;
    }
}


function generateRandomArgs(count) {
    var arr = new Array(count);
    for (var i=0; i<count; i++)
        arr[i] = generateRandomArg(i, count);
    return arr;
}

mutateArgs = function(args) {
  var mutateCount = randomIntFromRange(1, args.length);
  var newArgs = Array.from(args);
  for (var i=0; i<mutateCount; i++) {
    var idx = randomInt(args.length);
    newArgs[idx] = generateRandomArg(idx, args.length);
  }
  return newArgs;
};


qc = function(argGens, predicate, count) {
  var args;
  try {
    for (var i=0; i<count; i++) {
      args = argGens.map(function(g) { return g(); });
      var rv = predicate.apply(this, args);
      if (!rv) return {success: false, failedOn: args};
    }
  } catch(e) {
    return {success: false, failedOn: args, exception: e};
  }
  return {success: true};
};


// ArgGenerators contains argument generators for functions.
// The argument generators are used for running random tests against the
// functions.
//
// ArgGenerators is an object consisting of functionName : argGen -properties.
//
// functionName is a function name and the argGen is an argument
// generator object that encapsulates the requirements to run
// randomly generated tests on the function.
//
// An argGen object has the following methods:
//   - setup    -- set up state for testing the function, returns values
//                 that need cleanup in teardown. Run once before entering a
//                 test loop.
//   - teardown -- do cleanup on setup's return values after testing is complete
//   - generate -- generate a valid set of random arguments for the function
//   - returnValueCleanup -- do cleanup on value returned by the tested function
//   - cleanup  -- do cleanup on generated arguments from generate
//   - checkArgValidity -- check if passed args are valid. Has a call signature
//                         that matches generate's return value. Returns true
//                         if args are valid, false if not.
//
//   Example test loop that demonstrates how the function args and return
//   values flow together:
//
//   var setupArgs = argGen.setup();
//   for (var i=0; i<numberOfTests; i++) {
//     var generatedArgs = argGen.generate.apply(argGen, setupArgs);
//     var validArgs = argGen.checkArgValidity.apply(argGen, generatedArgs);
//     var rv = call the function with generatedArgs;
//     argGen.returnValueCleanup(rv);
//     argGen.cleanup.apply(argGen, generatedArgs);
//   }
//   argGen.teardown.apply(argGen, setupArgs);
//
ArgGenerators = {

  getAttachedShaders : {
    setup : function() {
      var program = GL.createProgram();
      var s1 = GL.createShader(GL.VERTEX_SHADER);
      var s2 = GL.createShader(GL.FRAGMENT_SHADER);
      GL.attachShader(program, s1);
      GL.attachShader(program, s2);
      return [program, s1, s2];
    },
    generate : function(program, s1, s2) {
      return [program]
    },
    checkArgValidity : function(program) {
      return GL.isProgram(program);
    },
    teardown : function(program, s1, s2) {
      GL.deleteProgram(program);
      GL.deleteShader(s1);
      GL.deleteShader(s2);
    }
  }

};


// Calls testFunction numberOfTests times with arguments generated by
// argGen.generate() (or empty arguments if no generate present).
//
// The arguments testFunction is called with are the generated args,
// the argGen, and what argGen.setup() returned or [] if argGen has not setup
// method. I.e. testFunction(generatedArgs, argGen, setupVars).
//
argGeneratorTestRunner = function(argGen, testFunction, numberOfTests) {
  // do argument generator setup if needed
  var setupVars = argGen.setup ? argGen.setup() : [];
  var error;
  for (var i=0; i<numberOfTests; i++) {
    var failed = false;
    // generate arguments if argGen has a generate method
    var generatedArgs = argGen.generate ? argGen.generate.apply(argGen, setupVars) : [];
    try {
      // call testFunction with the generated args
      testFunction.call(this, generatedArgs, argGen, setupVars);
    } catch (e) {
      failed = true;
      error = e;
    }
    // if argGen needs cleanup for generated args, do it here
    if (argGen.cleanup)
      argGen.cleanup.apply(argGen, generatedArgs);
    if (failed) break;
  }
  // if argGen needs to do a final cleanup for setupVars, do it here
  if (argGen.teardown)
    argGen.teardown.apply(argGen, setupVars);
  if (error) throw(error);
}

function initTests() {
  if (Tests.message != null) {
    var h = document.getElementById('test-message');
    if (h == null) {
      h = document.createElement('p');
      h.id = 'test-message';
      document.body.insertBefore(h, document.body.firstChild);
    }
    h.textContent = Tests.message;
  }
  if (Tests.autorun) {
    runTests();
  } else {
    var h = document.getElementById('test-run');
    if (h == null) {
      h = document.createElement('input');
      h.type = 'submit';
      h.value = "Run tests";
      h.addEventListener('click', function(ev){
        runTests();
        ev.preventDefault();
      }, false);
      h.id = 'test-run';
      document.body.insertBefore(h, document.body.firstChild);
    }
    h.textContent = Tests.message;
  }
  
}
