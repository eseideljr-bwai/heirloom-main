"use strict";exports.id=766,exports.ids=[766],exports.modules={6506:(e,t,r)=>{r.d(t,{default:()=>i.a});var n=r(1476),i=r.n(n)},8428:(e,t,r)=>{var n=r(4767);r.o(n,"usePathname")&&r.d(t,{usePathname:function(){return n.usePathname}}),r.o(n,"useRouter")&&r.d(t,{useRouter:function(){return n.useRouter}})},1314:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"addLocale",{enumerable:!0,get:function(){return n}}),r(9847);let n=function(e){for(var t=arguments.length,r=Array(t>1?t-1:0),n=1;n<t;n++)r[n-1]=arguments[n];return e};("function"==typeof t.default||"object"==typeof t.default&&null!==t.default)&&void 0===t.default.__esModule&&(Object.defineProperty(t.default,"__esModule",{value:!0}),Object.assign(t.default,t),e.exports=t.default)},3055:(e,t,r)=>{function n(e,t,r,n){return!1}Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"getDomainLocale",{enumerable:!0,get:function(){return n}}),r(9847),("function"==typeof t.default||"object"==typeof t.default&&null!==t.default)&&void 0===t.default.__esModule&&(Object.defineProperty(t.default,"__esModule",{value:!0}),Object.assign(t.default,t),e.exports=t.default)},1476:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"default",{enumerable:!0,get:function(){return I}});let n=r(9694),i=r(5344),s=n._(r(3729)),a=r(6656),o=r(6737),l=r(2421),c=r(853),u=r(1314),h=r(6150),d=r(6860),f=r(3470),p=r(3055),m=r(8928),g=r(8085);function _(e){return"string"==typeof e?e:(0,l.formatUrl)(e)}let I=s.default.forwardRef(function(e,t){let r,n;let{href:l,as:I,children:y,prefetch:v=null,passHref:b,replace:E,shallow:w,scroll:T,locale:S,onClick:R,onMouseEnter:C,onTouchStart:O,legacyBehavior:P=!1,...A}=e;r=y,P&&("string"==typeof r||"number"==typeof r)&&(r=(0,i.jsx)("a",{children:r}));let N=s.default.useContext(h.RouterContext),k=s.default.useContext(d.AppRouterContext),D=null!=N?N:k,L=!N,M=!1!==v,U=null===v?g.PrefetchKind.AUTO:g.PrefetchKind.FULL,{href:x,as:F}=s.default.useMemo(()=>{if(!N){let e=_(l);return{href:e,as:I?_(I):e}}let[e,t]=(0,a.resolveHref)(N,l,!0);return{href:e,as:I?(0,a.resolveHref)(N,I):t||e}},[N,l,I]),j=s.default.useRef(x),V=s.default.useRef(F);P&&(n=s.default.Children.only(r));let H=P?n&&"object"==typeof n&&n.ref:t,[B,z,$]=(0,f.useIntersection)({rootMargin:"200px"}),W=s.default.useCallback(e=>{(V.current!==F||j.current!==x)&&($(),V.current=F,j.current=x),B(e),H&&("function"==typeof H?H(e):"object"==typeof H&&(H.current=e))},[F,H,x,$,B]);s.default.useEffect(()=>{},[F,x,z,S,M,null==N?void 0:N.locale,D,L,U]);let K={ref:W,onClick(e){P||"function"!=typeof R||R(e),P&&n.props&&"function"==typeof n.props.onClick&&n.props.onClick(e),D&&!e.defaultPrevented&&function(e,t,r,n,i,a,l,c,u){let{nodeName:h}=e.currentTarget;if("A"===h.toUpperCase()&&(function(e){let t=e.currentTarget.getAttribute("target");return t&&"_self"!==t||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.nativeEvent&&2===e.nativeEvent.which}(e)||!u&&!(0,o.isLocalURL)(r)))return;e.preventDefault();let d=()=>{let e=null==l||l;"beforePopState"in t?t[i?"replace":"push"](r,n,{shallow:a,locale:c,scroll:e}):t[i?"replace":"push"](n||r,{scroll:e})};u?s.default.startTransition(d):d()}(e,D,x,F,E,w,T,S,L)},onMouseEnter(e){P||"function"!=typeof C||C(e),P&&n.props&&"function"==typeof n.props.onMouseEnter&&n.props.onMouseEnter(e)},onTouchStart(e){P||"function"!=typeof O||O(e),P&&n.props&&"function"==typeof n.props.onTouchStart&&n.props.onTouchStart(e)}};if((0,c.isAbsoluteUrl)(F))K.href=F;else if(!P||b||"a"===n.type&&!("href"in n.props)){let e=void 0!==S?S:null==N?void 0:N.locale,t=(null==N?void 0:N.isLocaleDomain)&&(0,p.getDomainLocale)(F,e,null==N?void 0:N.locales,null==N?void 0:N.domainLocales);K.href=t||(0,m.addBasePath)((0,u.addLocale)(F,e,null==N?void 0:N.defaultLocale))}return P?s.default.cloneElement(n,K):(0,i.jsx)("a",{...A,...K,children:r})});("function"==typeof t.default||"object"==typeof t.default&&null!==t.default)&&void 0===t.default.__esModule&&(Object.defineProperty(t.default,"__esModule",{value:!0}),Object.assign(t.default,t),e.exports=t.default)},6252:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),function(e,t){for(var r in t)Object.defineProperty(e,r,{enumerable:!0,get:t[r]})}(t,{requestIdleCallback:function(){return r},cancelIdleCallback:function(){return n}});let r="undefined"!=typeof self&&self.requestIdleCallback&&self.requestIdleCallback.bind(window)||function(e){let t=Date.now();return self.setTimeout(function(){e({didTimeout:!1,timeRemaining:function(){return Math.max(0,50-(Date.now()-t))}})},1)},n="undefined"!=typeof self&&self.cancelIdleCallback&&self.cancelIdleCallback.bind(window)||function(e){return clearTimeout(e)};("function"==typeof t.default||"object"==typeof t.default&&null!==t.default)&&void 0===t.default.__esModule&&(Object.defineProperty(t.default,"__esModule",{value:!0}),Object.assign(t.default,t),e.exports=t.default)},6656:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"resolveHref",{enumerable:!0,get:function(){return h}});let n=r(7043),i=r(2421),s=r(663),a=r(853),o=r(9847),l=r(6737),c=r(4831),u=r(8729);function h(e,t,r){let h;let d="string"==typeof t?t:(0,i.formatWithValidation)(t),f=d.match(/^[a-zA-Z]{1,}:\/\//),p=f?d.slice(f[0].length):d;if((p.split("?",1)[0]||"").match(/(\/\/|\\)/)){console.error("Invalid href '"+d+"' passed to next/router in page: '"+e.pathname+"'. Repeated forward-slashes (//) or backslashes \\ are not valid in the href.");let t=(0,a.normalizeRepeatedSlashes)(p);d=(f?f[0]:"")+t}if(!(0,l.isLocalURL)(d))return r?[d]:d;try{h=new URL(d.startsWith("#")?e.asPath:e.pathname,"http://n")}catch(e){h=new URL("/","http://n")}try{let e=new URL(d,h);e.pathname=(0,o.normalizePathTrailingSlash)(e.pathname);let t="";if((0,c.isDynamicRoute)(e.pathname)&&e.searchParams&&r){let r=(0,n.searchParamsToUrlQuery)(e.searchParams),{result:a,params:o}=(0,u.interpolateAs)(e.pathname,e.pathname,r);a&&(t=(0,i.formatWithValidation)({pathname:a,hash:e.hash,query:(0,s.omit)(r,o)}))}let a=e.origin===h.origin?e.href.slice(e.origin.length):e.href;return r?[a,t||a]:a}catch(e){return r?[d]:d}}("function"==typeof t.default||"object"==typeof t.default&&null!==t.default)&&void 0===t.default.__esModule&&(Object.defineProperty(t.default,"__esModule",{value:!0}),Object.assign(t.default,t),e.exports=t.default)},3470:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"useIntersection",{enumerable:!0,get:function(){return l}});let n=r(3729),i=r(6252),s="function"==typeof IntersectionObserver,a=new Map,o=[];function l(e){let{rootRef:t,rootMargin:r,disabled:l}=e,c=l||!s,[u,h]=(0,n.useState)(!1),d=(0,n.useRef)(null),f=(0,n.useCallback)(e=>{d.current=e},[]);return(0,n.useEffect)(()=>{if(s){if(c||u)return;let e=d.current;if(e&&e.tagName)return function(e,t,r){let{id:n,observer:i,elements:s}=function(e){let t;let r={root:e.root||null,margin:e.rootMargin||""},n=o.find(e=>e.root===r.root&&e.margin===r.margin);if(n&&(t=a.get(n)))return t;let i=new Map;return t={id:r,observer:new IntersectionObserver(e=>{e.forEach(e=>{let t=i.get(e.target),r=e.isIntersecting||e.intersectionRatio>0;t&&r&&t(r)})},e),elements:i},o.push(r),a.set(r,t),t}(r);return s.set(e,t),i.observe(e),function(){if(s.delete(e),i.unobserve(e),0===s.size){i.disconnect(),a.delete(n);let e=o.findIndex(e=>e.root===n.root&&e.margin===n.margin);e>-1&&o.splice(e,1)}}}(e,e=>e&&h(e),{root:null==t?void 0:t.current,rootMargin:r})}else if(!u){let e=(0,i.requestIdleCallback)(()=>h(!0));return()=>(0,i.cancelIdleCallback)(e)}},[c,r,t,u,d.current]),[f,u,(0,n.useCallback)(()=>{h(!1)},[])]}("function"==typeof t.default||"object"==typeof t.default&&null!==t.default)&&void 0===t.default.__esModule&&(Object.defineProperty(t.default,"__esModule",{value:!0}),Object.assign(t.default,t),e.exports=t.default)},6150:(e,t,r)=>{e.exports=r(6372).vendored.contexts.RouterContext},7866:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"escapeStringRegexp",{enumerable:!0,get:function(){return i}});let r=/[|\\{}()[\]^$+*?.-]/,n=/[|\\{}()[\]^$+*?.-]/g;function i(e){return r.test(e)?e.replace(n,"\\$&"):e}},2421:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),function(e,t){for(var r in t)Object.defineProperty(e,r,{enumerable:!0,get:t[r]})}(t,{formatUrl:function(){return s},urlObjectKeys:function(){return a},formatWithValidation:function(){return o}});let n=r(7824)._(r(7043)),i=/https?|ftp|gopher|file/;function s(e){let{auth:t,hostname:r}=e,s=e.protocol||"",a=e.pathname||"",o=e.hash||"",l=e.query||"",c=!1;t=t?encodeURIComponent(t).replace(/%3A/i,":")+"@":"",e.host?c=t+e.host:r&&(c=t+(~r.indexOf(":")?"["+r+"]":r),e.port&&(c+=":"+e.port)),l&&"object"==typeof l&&(l=String(n.urlQueryToSearchParams(l)));let u=e.search||l&&"?"+l||"";return s&&!s.endsWith(":")&&(s+=":"),e.slashes||(!s||i.test(s))&&!1!==c?(c="//"+(c||""),a&&"/"!==a[0]&&(a="/"+a)):c||(c=""),o&&"#"!==o[0]&&(o="#"+o),u&&"?"!==u[0]&&(u="?"+u),""+s+c+(a=a.replace(/[?#]/g,encodeURIComponent))+(u=u.replace("#","%23"))+o}let a=["auth","hash","host","hostname","href","path","pathname","port","protocol","query","search","slashes"];function o(e){return s(e)}},4831:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),function(e,t){for(var r in t)Object.defineProperty(e,r,{enumerable:!0,get:t[r]})}(t,{getSortedRoutes:function(){return n.getSortedRoutes},isDynamicRoute:function(){return i.isDynamicRoute}});let n=r(6177),i=r(5508)},8729:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"interpolateAs",{enumerable:!0,get:function(){return s}});let n=r(2694),i=r(6603);function s(e,t,r){let s="",a=(0,i.getRouteRegex)(e),o=a.groups,l=(t!==e?(0,n.getRouteMatcher)(a)(t):"")||r;s=e;let c=Object.keys(o);return c.every(e=>{let t=l[e]||"",{repeat:r,optional:n}=o[e],i="["+(r?"...":"")+e+"]";return n&&(i=(t?"":"/")+"["+i+"]"),r&&!Array.isArray(t)&&(t=[t]),(n||e in l)&&(s=s.replace(i,r?t.map(e=>encodeURIComponent(e)).join("/"):encodeURIComponent(t))||"/")})||(s=""),{params:c,result:s}}},5508:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"isDynamicRoute",{enumerable:!0,get:function(){return s}});let n=r(5767),i=/\/\[[^/]+?\](?=\/|$)/;function s(e){return(0,n.isInterceptionRouteAppPath)(e)&&(e=(0,n.extractInterceptionRouteInformation)(e).interceptedRoute),i.test(e)}},6737:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"isLocalURL",{enumerable:!0,get:function(){return s}});let n=r(853),i=r(6411);function s(e){if(!(0,n.isAbsoluteUrl)(e))return!0;try{let t=(0,n.getLocationOrigin)(),r=new URL(e,t);return r.origin===t&&(0,i.hasBasePath)(r.pathname)}catch(e){return!1}}},663:(e,t)=>{function r(e,t){let r={};return Object.keys(e).forEach(n=>{t.includes(n)||(r[n]=e[n])}),r}Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"omit",{enumerable:!0,get:function(){return r}})},7043:(e,t)=>{function r(e){let t={};return e.forEach((e,r)=>{void 0===t[r]?t[r]=e:Array.isArray(t[r])?t[r].push(e):t[r]=[t[r],e]}),t}function n(e){return"string"!=typeof e&&("number"!=typeof e||isNaN(e))&&"boolean"!=typeof e?"":String(e)}function i(e){let t=new URLSearchParams;return Object.entries(e).forEach(e=>{let[r,i]=e;Array.isArray(i)?i.forEach(e=>t.append(r,n(e))):t.set(r,n(i))}),t}function s(e){for(var t=arguments.length,r=Array(t>1?t-1:0),n=1;n<t;n++)r[n-1]=arguments[n];return r.forEach(t=>{Array.from(t.keys()).forEach(t=>e.delete(t)),t.forEach((t,r)=>e.append(r,t))}),e}Object.defineProperty(t,"__esModule",{value:!0}),function(e,t){for(var r in t)Object.defineProperty(e,r,{enumerable:!0,get:t[r]})}(t,{searchParamsToUrlQuery:function(){return r},urlQueryToSearchParams:function(){return i},assign:function(){return s}})},2694:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"getRouteMatcher",{enumerable:!0,get:function(){return i}});let n=r(853);function i(e){let{re:t,groups:r}=e;return e=>{let i=t.exec(e);if(!i)return!1;let s=e=>{try{return decodeURIComponent(e)}catch(e){throw new n.DecodeError("failed to decode param")}},a={};return Object.keys(r).forEach(e=>{let t=r[e],n=i[t.pos];void 0!==n&&(a[e]=~n.indexOf("/")?n.split("/").map(e=>s(e)):t.repeat?[s(n)]:s(n))}),a}}},6603:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),function(e,t){for(var r in t)Object.defineProperty(e,r,{enumerable:!0,get:t[r]})}(t,{getRouteRegex:function(){return l},getNamedRouteRegex:function(){return h},getNamedMiddlewareRegex:function(){return d}});let n=r(5767),i=r(7866),s=r(4310);function a(e){let t=e.startsWith("[")&&e.endsWith("]");t&&(e=e.slice(1,-1));let r=e.startsWith("...");return r&&(e=e.slice(3)),{key:e,repeat:r,optional:t}}function o(e){let t=(0,s.removeTrailingSlash)(e).slice(1).split("/"),r={},o=1;return{parameterizedRoute:t.map(e=>{let t=n.INTERCEPTION_ROUTE_MARKERS.find(t=>e.startsWith(t)),s=e.match(/\[((?:\[.*\])|.+)\]/);if(t&&s){let{key:e,optional:n,repeat:l}=a(s[1]);return r[e]={pos:o++,repeat:l,optional:n},"/"+(0,i.escapeStringRegexp)(t)+"([^/]+?)"}if(!s)return"/"+(0,i.escapeStringRegexp)(e);{let{key:e,repeat:t,optional:n}=a(s[1]);return r[e]={pos:o++,repeat:t,optional:n},t?n?"(?:/(.+?))?":"/(.+?)":"/([^/]+?)"}}).join(""),groups:r}}function l(e){let{parameterizedRoute:t,groups:r}=o(e);return{re:RegExp("^"+t+"(?:/)?$"),groups:r}}function c(e){let{interceptionMarker:t,getSafeRouteKey:r,segment:n,routeKeys:s,keyPrefix:o}=e,{key:l,optional:c,repeat:u}=a(n),h=l.replace(/\W/g,"");o&&(h=""+o+h);let d=!1;(0===h.length||h.length>30)&&(d=!0),isNaN(parseInt(h.slice(0,1)))||(d=!0),d&&(h=r()),o?s[h]=""+o+l:s[h]=l;let f=t?(0,i.escapeStringRegexp)(t):"";return u?c?"(?:/"+f+"(?<"+h+">.+?))?":"/"+f+"(?<"+h+">.+?)":"/"+f+"(?<"+h+">[^/]+?)"}function u(e,t){let r;let a=(0,s.removeTrailingSlash)(e).slice(1).split("/"),o=(r=0,()=>{let e="",t=++r;for(;t>0;)e+=String.fromCharCode(97+(t-1)%26),t=Math.floor((t-1)/26);return e}),l={};return{namedParameterizedRoute:a.map(e=>{let r=n.INTERCEPTION_ROUTE_MARKERS.some(t=>e.startsWith(t)),s=e.match(/\[((?:\[.*\])|.+)\]/);if(r&&s){let[r]=e.split(s[0]);return c({getSafeRouteKey:o,interceptionMarker:r,segment:s[1],routeKeys:l,keyPrefix:t?"nxtI":void 0})}return s?c({getSafeRouteKey:o,segment:s[1],routeKeys:l,keyPrefix:t?"nxtP":void 0}):"/"+(0,i.escapeStringRegexp)(e)}).join(""),routeKeys:l}}function h(e,t){let r=u(e,t);return{...l(e),namedRegex:"^"+r.namedParameterizedRoute+"(?:/)?$",routeKeys:r.routeKeys}}function d(e,t){let{parameterizedRoute:r}=o(e),{catchAll:n=!0}=t;if("/"===r)return{namedRegex:"^/"+(n?".*":"")+"$"};let{namedParameterizedRoute:i}=u(e,!1);return{namedRegex:"^"+i+(n?"(?:(/.*)?)":"")+"$"}}},6177:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"getSortedRoutes",{enumerable:!0,get:function(){return n}});class r{insert(e){this._insert(e.split("/").filter(Boolean),[],!1)}smoosh(){return this._smoosh()}_smoosh(e){void 0===e&&(e="/");let t=[...this.children.keys()].sort();null!==this.slugName&&t.splice(t.indexOf("[]"),1),null!==this.restSlugName&&t.splice(t.indexOf("[...]"),1),null!==this.optionalRestSlugName&&t.splice(t.indexOf("[[...]]"),1);let r=t.map(t=>this.children.get(t)._smoosh(""+e+t+"/")).reduce((e,t)=>[...e,...t],[]);if(null!==this.slugName&&r.push(...this.children.get("[]")._smoosh(e+"["+this.slugName+"]/")),!this.placeholder){let t="/"===e?"/":e.slice(0,-1);if(null!=this.optionalRestSlugName)throw Error('You cannot define a route with the same specificity as a optional catch-all route ("'+t+'" and "'+t+"[[..."+this.optionalRestSlugName+']]").');r.unshift(t)}return null!==this.restSlugName&&r.push(...this.children.get("[...]")._smoosh(e+"[..."+this.restSlugName+"]/")),null!==this.optionalRestSlugName&&r.push(...this.children.get("[[...]]")._smoosh(e+"[[..."+this.optionalRestSlugName+"]]/")),r}_insert(e,t,n){if(0===e.length){this.placeholder=!1;return}if(n)throw Error("Catch-all must be the last part of the URL.");let i=e[0];if(i.startsWith("[")&&i.endsWith("]")){let r=i.slice(1,-1),a=!1;if(r.startsWith("[")&&r.endsWith("]")&&(r=r.slice(1,-1),a=!0),r.startsWith("...")&&(r=r.substring(3),n=!0),r.startsWith("[")||r.endsWith("]"))throw Error("Segment names may not start or end with extra brackets ('"+r+"').");if(r.startsWith("."))throw Error("Segment names may not start with erroneous periods ('"+r+"').");function s(e,r){if(null!==e&&e!==r)throw Error("You cannot use different slug names for the same dynamic path ('"+e+"' !== '"+r+"').");t.forEach(e=>{if(e===r)throw Error('You cannot have the same slug name "'+r+'" repeat within a single dynamic path');if(e.replace(/\W/g,"")===i.replace(/\W/g,""))throw Error('You cannot have the slug names "'+e+'" and "'+r+'" differ only by non-word symbols within a single dynamic path')}),t.push(r)}if(n){if(a){if(null!=this.restSlugName)throw Error('You cannot use both an required and optional catch-all route at the same level ("[...'+this.restSlugName+']" and "'+e[0]+'" ).');s(this.optionalRestSlugName,r),this.optionalRestSlugName=r,i="[[...]]"}else{if(null!=this.optionalRestSlugName)throw Error('You cannot use both an optional and required catch-all route at the same level ("[[...'+this.optionalRestSlugName+']]" and "'+e[0]+'").');s(this.restSlugName,r),this.restSlugName=r,i="[...]"}}else{if(a)throw Error('Optional route parameters are not yet supported ("'+e[0]+'").');s(this.slugName,r),this.slugName=r,i="[]"}}this.children.has(i)||this.children.set(i,new r),this.children.get(i)._insert(e.slice(1),t,n)}constructor(){this.placeholder=!0,this.children=new Map,this.slugName=null,this.restSlugName=null,this.optionalRestSlugName=null}}function n(e){let t=new r;return e.forEach(e=>t.insert(e)),t.smoosh()}},853:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),function(e,t){for(var r in t)Object.defineProperty(e,r,{enumerable:!0,get:t[r]})}(t,{WEB_VITALS:function(){return r},execOnce:function(){return n},isAbsoluteUrl:function(){return s},getLocationOrigin:function(){return a},getURL:function(){return o},getDisplayName:function(){return l},isResSent:function(){return c},normalizeRepeatedSlashes:function(){return u},loadGetInitialProps:function(){return h},SP:function(){return d},ST:function(){return f},DecodeError:function(){return p},NormalizeError:function(){return m},PageNotFoundError:function(){return g},MissingStaticPage:function(){return _},MiddlewareNotFoundError:function(){return I},stringifyError:function(){return y}});let r=["CLS","FCP","FID","INP","LCP","TTFB"];function n(e){let t,r=!1;return function(){for(var n=arguments.length,i=Array(n),s=0;s<n;s++)i[s]=arguments[s];return r||(r=!0,t=e(...i)),t}}let i=/^[a-zA-Z][a-zA-Z\d+\-.]*?:/,s=e=>i.test(e);function a(){let{protocol:e,hostname:t,port:r}=window.location;return e+"//"+t+(r?":"+r:"")}function o(){let{href:e}=window.location,t=a();return e.substring(t.length)}function l(e){return"string"==typeof e?e:e.displayName||e.name||"Unknown"}function c(e){return e.finished||e.headersSent}function u(e){let t=e.split("?");return t[0].replace(/\\/g,"/").replace(/\/\/+/g,"/")+(t[1]?"?"+t.slice(1).join("?"):"")}async function h(e,t){let r=t.res||t.ctx&&t.ctx.res;if(!e.getInitialProps)return t.ctx&&t.Component?{pageProps:await h(t.Component,t.ctx)}:{};let n=await e.getInitialProps(t);if(r&&c(r))return n;if(!n)throw Error('"'+l(e)+'.getInitialProps()" should resolve to an object. But found "'+n+'" instead.');return n}let d="undefined"!=typeof performance,f=d&&["mark","measure","getEntriesByName"].every(e=>"function"==typeof performance[e]);class p extends Error{}class m extends Error{}class g extends Error{constructor(e){super(),this.code="ENOENT",this.name="PageNotFoundError",this.message="Cannot find module for page: "+e}}class _ extends Error{constructor(e,t){super(),this.message="Failed to load static file for page: "+e+" "+t}}class I extends Error{constructor(){super(),this.code="ENOENT",this.message="Cannot find the middleware module"}}function y(e){return JSON.stringify({message:e.message,stack:e.stack})}},1130:(e,t,r)=>{let n,i;r.d(t,{Jn:()=>x,qX:()=>D,rh:()=>L,Xd:()=>k,Mq:()=>j,C6:()=>V,ZF:()=>F,KN:()=>H});var s,a=r(1987),o=r(6524),l=r(1006);let c=(e,t)=>t.some(t=>e instanceof t),u=new WeakMap,h=new WeakMap,d=new WeakMap,f=new WeakMap,p=new WeakMap,m={get(e,t,r){if(e instanceof IDBTransaction){if("done"===t)return h.get(e);if("objectStoreNames"===t)return e.objectStoreNames||d.get(e);if("store"===t)return r.objectStoreNames[1]?void 0:r.objectStore(r.objectStoreNames[0])}return g(e[t])},set:(e,t,r)=>(e[t]=r,!0),has:(e,t)=>e instanceof IDBTransaction&&("done"===t||"store"===t)||t in e};function g(e){var t;if(e instanceof IDBRequest)return function(e){let t=new Promise((t,r)=>{let n=()=>{e.removeEventListener("success",i),e.removeEventListener("error",s)},i=()=>{t(g(e.result)),n()},s=()=>{r(e.error),n()};e.addEventListener("success",i),e.addEventListener("error",s)});return t.then(t=>{t instanceof IDBCursor&&u.set(t,e)}).catch(()=>{}),p.set(t,e),t}(e);if(f.has(e))return f.get(e);let r="function"==typeof(t=e)?t!==IDBDatabase.prototype.transaction||"objectStoreNames"in IDBTransaction.prototype?(i||(i=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])).includes(t)?function(...e){return t.apply(_(this),e),g(u.get(this))}:function(...e){return g(t.apply(_(this),e))}:function(e,...r){let n=t.call(_(this),e,...r);return d.set(n,e.sort?e.sort():[e]),g(n)}:(t instanceof IDBTransaction&&function(e){if(h.has(e))return;let t=new Promise((t,r)=>{let n=()=>{e.removeEventListener("complete",i),e.removeEventListener("error",s),e.removeEventListener("abort",s)},i=()=>{t(),n()},s=()=>{r(e.error||new DOMException("AbortError","AbortError")),n()};e.addEventListener("complete",i),e.addEventListener("error",s),e.addEventListener("abort",s)});h.set(e,t)}(t),c(t,n||(n=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])))?new Proxy(t,m):t;return r!==e&&(f.set(e,r),p.set(r,e)),r}let _=e=>p.get(e),I=["get","getKey","getAll","getAllKeys","count"],y=["put","add","delete","clear"],v=new Map;function b(e,t){if(!(e instanceof IDBDatabase&&!(t in e)&&"string"==typeof t))return;if(v.get(t))return v.get(t);let r=t.replace(/FromIndex$/,""),n=t!==r,i=y.includes(r);if(!(r in(n?IDBIndex:IDBObjectStore).prototype)||!(i||I.includes(r)))return;let s=async function(e,...t){let s=this.transaction(e,i?"readwrite":"readonly"),a=s.store;return n&&(a=a.index(t.shift())),(await Promise.all([a[r](...t),i&&s.done]))[0]};return v.set(t,s),s}m={...s=m,get:(e,t,r)=>b(e,t)||s.get(e,t,r),has:(e,t)=>!!b(e,t)||s.has(e,t)};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class E{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(e=>{if(!function(e){let t=e.getComponent();return t?.type==="VERSION"}(e))return null;{let t=e.getImmediate();return`${t.library}/${t.version}`}}).filter(e=>e).join(" ")}}let w="@firebase/app",T="0.14.9",S=new o.Yd("@firebase/app"),R="[DEFAULT]",C={[w]:"fire-core","@firebase/app-compat":"fire-core-compat","@firebase/analytics":"fire-analytics","@firebase/analytics-compat":"fire-analytics-compat","@firebase/app-check":"fire-app-check","@firebase/app-check-compat":"fire-app-check-compat","@firebase/auth":"fire-auth","@firebase/auth-compat":"fire-auth-compat","@firebase/database":"fire-rtdb","@firebase/data-connect":"fire-data-connect","@firebase/database-compat":"fire-rtdb-compat","@firebase/functions":"fire-fn","@firebase/functions-compat":"fire-fn-compat","@firebase/installations":"fire-iid","@firebase/installations-compat":"fire-iid-compat","@firebase/messaging":"fire-fcm","@firebase/messaging-compat":"fire-fcm-compat","@firebase/performance":"fire-perf","@firebase/performance-compat":"fire-perf-compat","@firebase/remote-config":"fire-rc","@firebase/remote-config-compat":"fire-rc-compat","@firebase/storage":"fire-gcs","@firebase/storage-compat":"fire-gcs-compat","@firebase/firestore":"fire-fst","@firebase/firestore-compat":"fire-fst-compat","@firebase/ai":"fire-vertex","fire-js":"fire-js",firebase:"fire-js-all"},O=new Map,P=new Map,A=new Map;function N(e,t){try{e.container.addComponent(t)}catch(r){S.debug(`Component ${t.name} failed to register with FirebaseApp ${e.name}`,r)}}function k(e){let t=e.name;if(A.has(t))return S.debug(`There were multiple attempts to register component ${t}.`),!1;for(let r of(A.set(t,e),O.values()))N(r,e);for(let t of P.values())N(t,e);return!0}function D(e,t){let r=e.container.getProvider("heartbeat").getImmediate({optional:!0});return r&&r.triggerHeartbeat(),e.container.getProvider(t)}function L(e){return null!=e&&void 0!==e.settings}let M=new l.LL("app","Firebase",{"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."});/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class U{constructor(e,t,r){this._isDeleted=!1,this._options={...e},this._config={...t},this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new a.wA("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw M.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let x="12.10.0";function F(e,t={}){let r=e;"object"!=typeof t&&(t={name:t});let n={name:R,automaticDataCollectionEnabled:!0,...t},i=n.name;if("string"!=typeof i||!i)throw M.create("bad-app-name",{appName:String(i)});if(r||(r=(0,l.aH)()),!r)throw M.create("no-options");let s=O.get(i);if(s){if((0,l.vZ)(r,s.options)&&(0,l.vZ)(n,s.config))return s;throw M.create("duplicate-app",{appName:i})}let o=new a.H0(i);for(let e of A.values())o.addComponent(e);let c=new U(r,n,o);return O.set(i,c),c}function j(e=R){let t=O.get(e);if(!t&&e===R&&(0,l.aH)())return F();if(!t)throw M.create("no-app",{appName:e});return t}function V(){return Array.from(O.values())}function H(e,t,r){let n=C[e]??e;r&&(n+=`-${r}`);let i=n.match(/\s|\//),s=t.match(/\s|\//);if(i||s){let e=[`Unable to register library "${n}" with version "${t}":`];i&&e.push(`library name "${n}" contains illegal characters (whitespace or "/")`),i&&s&&e.push("and"),s&&e.push(`version name "${t}" contains illegal characters (whitespace or "/")`),S.warn(e.join(" "));return}k(new a.wA(`${n}-version`,()=>({library:n,version:t}),"VERSION"))}let B="firebase-heartbeat-store",z=null;function $(){return z||(z=(function(e,t,{blocked:r,upgrade:n,blocking:i,terminated:s}={}){let a=indexedDB.open(e,1),o=g(a);return n&&a.addEventListener("upgradeneeded",e=>{n(g(a.result),e.oldVersion,e.newVersion,g(a.transaction),e)}),r&&a.addEventListener("blocked",e=>r(e.oldVersion,e.newVersion,e)),o.then(e=>{s&&e.addEventListener("close",()=>s()),i&&e.addEventListener("versionchange",e=>i(e.oldVersion,e.newVersion,e))}).catch(()=>{}),o})("firebase-heartbeat-database",0,{upgrade:(e,t)=>{if(0===t)try{e.createObjectStore(B)}catch(e){console.warn(e)}}}).catch(e=>{throw M.create("idb-open",{originalErrorMessage:e.message})})),z}async function W(e){try{let t=(await $()).transaction(B),r=await t.objectStore(B).get(G(e));return await t.done,r}catch(e){if(e instanceof l.ZR)S.warn(e.message);else{let t=M.create("idb-get",{originalErrorMessage:e?.message});S.warn(t.message)}}}async function K(e,t){try{let r=(await $()).transaction(B,"readwrite"),n=r.objectStore(B);await n.put(t,G(e)),await r.done}catch(e){if(e instanceof l.ZR)S.warn(e.message);else{let t=M.create("idb-set",{originalErrorMessage:e?.message});S.warn(t.message)}}}function G(e){return`${e.name}!${e.options.appId}`}class q{constructor(e){this.container=e,this._heartbeatsCache=null;let t=this.container.getProvider("app").getImmediate();this._storage=new Y(t),this._heartbeatsCachePromise=this._storage.read().then(e=>(this._heartbeatsCache=e,e))}async triggerHeartbeat(){try{let e=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),t=J();if(this._heartbeatsCache?.heartbeats==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,this._heartbeatsCache?.heartbeats==null)||this._heartbeatsCache.lastSentHeartbeatDate===t||this._heartbeatsCache.heartbeats.some(e=>e.date===t))return;if(this._heartbeatsCache.heartbeats.push({date:t,agent:e}),this._heartbeatsCache.heartbeats.length>30){let e=function(e){if(0===e.length)return -1;let t=0,r=e[0].date;for(let n=1;n<e.length;n++)e[n].date<r&&(r=e[n].date,t=n);return t}(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(e,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(e){S.warn(e)}}async getHeartbeatsHeader(){try{if(null===this._heartbeatsCache&&await this._heartbeatsCachePromise,this._heartbeatsCache?.heartbeats==null||0===this._heartbeatsCache.heartbeats.length)return"";let e=J(),{heartbeatsToSend:t,unsentEntries:r}=function(e,t=1024){let r=[],n=e.slice();for(let i of e){let e=r.find(e=>e.agent===i.agent);if(e){if(e.dates.push(i.date),X(r)>t){e.dates.pop();break}}else if(r.push({agent:i.agent,dates:[i.date]}),X(r)>t){r.pop();break}n=n.slice(1)}return{heartbeatsToSend:r,unsentEntries:n}}(this._heartbeatsCache.heartbeats),n=(0,l.L)(JSON.stringify({version:2,heartbeats:t}));return this._heartbeatsCache.lastSentHeartbeatDate=e,r.length>0?(this._heartbeatsCache.heartbeats=r,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),n}catch(e){return S.warn(e),""}}}function J(){return new Date().toISOString().substring(0,10)}class Y{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return!!(0,l.hl)()&&(0,l.eu)().then(()=>!0).catch(()=>!1)}async read(){if(!await this._canUseIndexedDBPromise)return{heartbeats:[]};{let e=await W(this.app);return e?.heartbeats?e:{heartbeats:[]}}}async overwrite(e){if(await this._canUseIndexedDBPromise){let t=await this.read();return K(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??t.lastSentHeartbeatDate,heartbeats:e.heartbeats})}}async add(e){if(await this._canUseIndexedDBPromise){let t=await this.read();return K(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??t.lastSentHeartbeatDate,heartbeats:[...t.heartbeats,...e.heartbeats]})}}}function X(e){return(0,l.L)(JSON.stringify({version:2,heartbeats:e})).length}k(new a.wA("platform-logger",e=>new E(e),"PRIVATE")),k(new a.wA("heartbeat",e=>new q(e),"PRIVATE")),H(w,T,""),H(w,T,"esm2020"),H("fire-js","")},1987:(e,t,r)=>{r.d(t,{H0:()=>o,wA:()=>i});var n=r(1006);class i{constructor(e,t,r){this.name=e,this.instanceFactory=t,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let s="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class a{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){let t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){let e=new n.BH;if(this.instancesDeferred.set(t,e),this.isInitialized(t)||this.shouldAutoInitialize())try{let r=this.getOrInitializeService({instanceIdentifier:t});r&&e.resolve(r)}catch(e){}}return this.instancesDeferred.get(t).promise}getImmediate(e){let t=this.normalizeInstanceIdentifier(e?.identifier),r=e?.optional??!1;if(this.isInitialized(t)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:t})}catch(e){if(r)return null;throw e}else{if(r)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,this.shouldAutoInitialize()){if("EAGER"===e.instantiationMode)try{this.getOrInitializeService({instanceIdentifier:s})}catch(e){}for(let[e,t]of this.instancesDeferred.entries()){let r=this.normalizeInstanceIdentifier(e);try{let e=this.getOrInitializeService({instanceIdentifier:r});t.resolve(e)}catch(e){}}}}clearInstance(e=s){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){let e=Array.from(this.instances.values());await Promise.all([...e.filter(e=>"INTERNAL"in e).map(e=>e.INTERNAL.delete()),...e.filter(e=>"_delete"in e).map(e=>e._delete())])}isComponentSet(){return null!=this.component}isInitialized(e=s){return this.instances.has(e)}getOptions(e=s){return this.instancesOptions.get(e)||{}}initialize(e={}){let{options:t={}}=e,r=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);let n=this.getOrInitializeService({instanceIdentifier:r,options:t});for(let[e,t]of this.instancesDeferred.entries())r===this.normalizeInstanceIdentifier(e)&&t.resolve(n);return n}onInit(e,t){let r=this.normalizeInstanceIdentifier(t),n=this.onInitCallbacks.get(r)??new Set;n.add(e),this.onInitCallbacks.set(r,n);let i=this.instances.get(r);return i&&e(i,r),()=>{n.delete(e)}}invokeOnInitCallbacks(e,t){let r=this.onInitCallbacks.get(t);if(r)for(let n of r)try{n(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let r=this.instances.get(e);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:e===s?void 0:e,options:t}),this.instances.set(e,r),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(r,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,r)}catch{}return r||null}normalizeInstanceIdentifier(e=s){return this.component?this.component.multipleInstances?e:s:e}shouldAutoInitialize(){return!!this.component&&"EXPLICIT"!==this.component.instantiationMode}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class o{constructor(e){this.name=e,this.providers=new Map}addComponent(e){let t=this.getProvider(e.name);if(t.isComponentSet())throw Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);let t=new a(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}},6524:(e,t,r)=>{var n;r.d(t,{Yd:()=>c,in:()=>n});/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let i=[];!function(e){e[e.DEBUG=0]="DEBUG",e[e.VERBOSE=1]="VERBOSE",e[e.INFO=2]="INFO",e[e.WARN=3]="WARN",e[e.ERROR=4]="ERROR",e[e.SILENT=5]="SILENT"}(n||(n={}));let s={debug:n.DEBUG,verbose:n.VERBOSE,info:n.INFO,warn:n.WARN,error:n.ERROR,silent:n.SILENT},a=n.INFO,o={[n.DEBUG]:"log",[n.VERBOSE]:"log",[n.INFO]:"info",[n.WARN]:"warn",[n.ERROR]:"error"},l=(e,t,...r)=>{if(t<e.logLevel)return;let n=new Date().toISOString(),i=o[t];if(i)console[i](`[${n}]  ${e.name}:`,...r);else throw Error(`Attempted to log a message with an invalid logType (value: ${t})`)};class c{constructor(e){this.name=e,this._logLevel=a,this._logHandler=l,this._userLogHandler=null,i.push(this)}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in n))throw TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel="string"==typeof e?s[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if("function"!=typeof e)throw TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,n.DEBUG,...e),this._logHandler(this,n.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,n.VERBOSE,...e),this._logHandler(this,n.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,n.INFO,...e),this._logHandler(this,n.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,n.WARN,...e),this._logHandler(this,n.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,n.ERROR,...e),this._logHandler(this,n.ERROR,...e)}}},1006:(e,t,r)=>{r.d(t,{BH:()=>_,LL:()=>P,ZR:()=>O,tV:()=>u,L:()=>c,ne:()=>M,vZ:()=>function e(t,r){if(t===r)return!0;let n=Object.keys(t),i=Object.keys(r);for(let s of n){if(!i.includes(s))return!1;let n=t[s],a=r[s];if(N(n)&&N(a)){if(!e(n,a))return!1}else if(n!==a)return!1}for(let e of i)if(!n.includes(e))return!1;return!0},pd:()=>L,aH:()=>g,q4:()=>m,m9:()=>F,z$:()=>b,ru:()=>T,Xx:()=>I,L_:()=>w,hl:()=>R,uI:()=>E,b$:()=>S,Uo:()=>y,xO:()=>k,zd:()=>D,dp:()=>v,eu:()=>C});let n=()=>void 0,i=function(e){let t=[],r=0;for(let n=0;n<e.length;n++){let i=e.charCodeAt(n);i<128?t[r++]=i:(i<2048?t[r++]=i>>6|192:((64512&i)==55296&&n+1<e.length&&(64512&e.charCodeAt(n+1))==56320?(i=65536+((1023&i)<<10)+(1023&e.charCodeAt(++n)),t[r++]=i>>18|240,t[r++]=i>>12&63|128):t[r++]=i>>12|224,t[r++]=i>>6&63|128),t[r++]=63&i|128)}return t},s=function(e){let t=[],r=0,n=0;for(;r<e.length;){let i=e[r++];if(i<128)t[n++]=String.fromCharCode(i);else if(i>191&&i<224){let s=e[r++];t[n++]=String.fromCharCode((31&i)<<6|63&s)}else if(i>239&&i<365){let s=((7&i)<<18|(63&e[r++])<<12|(63&e[r++])<<6|63&e[r++])-65536;t[n++]=String.fromCharCode(55296+(s>>10)),t[n++]=String.fromCharCode(56320+(1023&s))}else{let s=e[r++],a=e[r++];t[n++]=String.fromCharCode((15&i)<<12|(63&s)<<6|63&a)}}return t.join("")},a={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:"function"==typeof atob,encodeByteArray(e,t){if(!Array.isArray(e))throw Error("encodeByteArray takes an array as a parameter");this.init_();let r=t?this.byteToCharMapWebSafe_:this.byteToCharMap_,n=[];for(let t=0;t<e.length;t+=3){let i=e[t],s=t+1<e.length,a=s?e[t+1]:0,o=t+2<e.length,l=o?e[t+2]:0,c=i>>2,u=(3&i)<<4|a>>4,h=(15&a)<<2|l>>6,d=63&l;o||(d=64,s||(h=64)),n.push(r[c],r[u],r[h],r[d])}return n.join("")},encodeString(e,t){return this.HAS_NATIVE_SUPPORT&&!t?btoa(e):this.encodeByteArray(i(e),t)},decodeString(e,t){return this.HAS_NATIVE_SUPPORT&&!t?atob(e):s(this.decodeStringToByteArray(e,t))},decodeStringToByteArray(e,t){this.init_();let r=t?this.charToByteMapWebSafe_:this.charToByteMap_,n=[];for(let t=0;t<e.length;){let i=r[e.charAt(t++)],s=t<e.length?r[e.charAt(t)]:0,a=++t<e.length?r[e.charAt(t)]:64,l=++t<e.length?r[e.charAt(t)]:64;if(++t,null==i||null==s||null==a||null==l)throw new o;let c=i<<2|s>>4;if(n.push(c),64!==a){let e=s<<4&240|a>>2;if(n.push(e),64!==l){let e=a<<6&192|l;n.push(e)}}}return n},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let e=0;e<this.ENCODED_VALS.length;e++)this.byteToCharMap_[e]=this.ENCODED_VALS.charAt(e),this.charToByteMap_[this.byteToCharMap_[e]]=e,this.byteToCharMapWebSafe_[e]=this.ENCODED_VALS_WEBSAFE.charAt(e),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[e]]=e,e>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(e)]=e,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(e)]=e)}}};class o extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}let l=function(e){let t=i(e);return a.encodeByteArray(t,!0)},c=function(e){return l(e).replace(/\./g,"")},u=function(e){try{return a.decodeString(e,!0)}catch(e){console.error("base64Decode failed: ",e)}return null},h=()=>/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(function(){if("undefined"!=typeof self)return self;if("undefined"!=typeof global)return global;throw Error("Unable to locate global object.")})().__FIREBASE_DEFAULTS__,d=()=>{if("undefined"==typeof process||void 0===process.env)return;let e=process.env.__FIREBASE_DEFAULTS__;if(e)return JSON.parse(e)},f=()=>{let e;if("undefined"==typeof document)return;try{e=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch(e){return}let t=e&&u(e[1]);return t&&JSON.parse(t)},p=()=>{try{return n()||h()||d()||f()}catch(e){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);return}},m=e=>p()?.emulatorHosts?.[e],g=()=>p()?.config;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,r)=>{t?this.reject(t):this.resolve(r),"function"==typeof e&&(this.promise.catch(()=>{}),1===e.length?e(t):e(t,r))}}}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function I(e){try{return(e.startsWith("http://")||e.startsWith("https://")?new URL(e).hostname:e).endsWith(".cloudworkstations.dev")}catch{return!1}}async function y(e){return(await fetch(e,{credentials:"include"})).ok}function v(e,t){}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function b(){return"undefined"!=typeof navigator&&"string"==typeof navigator.userAgent?navigator.userAgent:""}function E(){return!1}function w(){return"undefined"!=typeof navigator&&"Cloudflare-Workers"===navigator.userAgent}function T(){let e="object"==typeof chrome?chrome.runtime:"object"==typeof browser?browser.runtime:void 0;return"object"==typeof e&&void 0!==e.id}function S(){return"object"==typeof navigator&&"ReactNative"===navigator.product}function R(){try{return"object"==typeof indexedDB}catch(e){return!1}}function C(){return new Promise((e,t)=>{try{let r=!0,n="validate-browser-context-for-indexeddb-analytics-module",i=self.indexedDB.open(n);i.onsuccess=()=>{i.result.close(),r||self.indexedDB.deleteDatabase(n),e(!0)},i.onupgradeneeded=()=>{r=!1},i.onerror=()=>{t(i.error?.message||"")}}catch(e){t(e)}})}class O extends Error{constructor(e,t,r){super(t),this.code=e,this.customData=r,this.name="FirebaseError",Object.setPrototypeOf(this,O.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,P.prototype.create)}}class P{constructor(e,t,r){this.service=e,this.serviceName=t,this.errors=r}create(e,...t){let r=t[0]||{},n=`${this.service}/${e}`,i=this.errors[e],s=i?i.replace(A,(e,t)=>{let n=r[t];return null!=n?String(n):`<${t}?>`}):"Error",a=`${this.serviceName}: ${s} (${n}).`;return new O(n,a,r)}}let A=/\{\$([^}]+)}/g;function N(e){return null!==e&&"object"==typeof e}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function k(e){let t=[];for(let[r,n]of Object.entries(e))Array.isArray(n)?n.forEach(e=>{t.push(encodeURIComponent(r)+"="+encodeURIComponent(e))}):t.push(encodeURIComponent(r)+"="+encodeURIComponent(n));return t.length?"&"+t.join("&"):""}function D(e){let t={};return e.replace(/^\?/,"").split("&").forEach(e=>{if(e){let[r,n]=e.split("=");t[decodeURIComponent(r)]=decodeURIComponent(n)}}),t}function L(e){let t=e.indexOf("?");if(!t)return"";let r=e.indexOf("#",t);return e.substring(t,r>0?r:void 0)}function M(e,t){let r=new U(e,t);return r.subscribe.bind(r)}class U{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(e=>{this.error(e)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,r){let n;if(void 0===e&&void 0===t&&void 0===r)throw Error("Missing Observer.");void 0===(n=!function(e,t){if("object"!=typeof e||null===e)return!1;for(let r of t)if(r in e&&"function"==typeof e[r])return!0;return!1}(e,["next","error","complete"])?{next:e,error:t,complete:r}:e).next&&(n.next=x),void 0===n.error&&(n.error=x),void 0===n.complete&&(n.complete=x);let i=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?n.error(this.finalError):n.complete()}catch(e){}}),this.observers.push(n),i}unsubscribeOne(e){void 0!==this.observers&&void 0!==this.observers[e]&&(delete this.observers[e],this.observerCount-=1,0===this.observerCount&&void 0!==this.onNoObservers&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(void 0!==this.observers&&void 0!==this.observers[e])try{t(this.observers[e])}catch(e){"undefined"!=typeof console&&console.error&&console.error(e)}})}close(e){this.finalized||(this.finalized=!0,void 0!==e&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function x(){}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function F(e){return e&&e._delegate?e._delegate:e}},6041:(e,t,r)=>{r.d(t,{C6:()=>n.C6,Mq:()=>n.Mq,ZF:()=>n.ZF});var n=r(1130);/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(0,n.KN)("firebase","12.10.0","app")},6954:(e,t,r)=>{r.d(t,{Xb:()=>eW,v0:()=>e1,Aj:()=>eG,e5:()=>eK,w7:()=>eq});var n=r(1130),i=r(1006),s=r(1987),a=r(6524);function o(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}let l=new i.LL("auth","Firebase",o()),c=new a.Yd("@firebase/auth");function u(e,...t){c.logLevel<=a.in.ERROR&&c.error(`Auth (${n.Jn}): ${e}`,...t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function h(e,...t){throw m(e,...t)}function d(e,...t){return m(e,...t)}function f(e,t,r){let n={...o(),[t]:r};return new i.LL("auth","Firebase",n).create(t,{appName:e.name})}function p(e){return f(e,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function m(e,...t){if("string"!=typeof e){let r=t[0],n=[...t.slice(1)];return n[0]&&(n[0].appName=e.name),e._errorFactory.create(r,...n)}return l.create(e,...t)}function g(e,t,...r){if(!e)throw m(t,...r)}function _(e){let t="INTERNAL ASSERTION FAILED: "+e;throw u(t),Error(t)}function I(){return"undefined"!=typeof self&&self.location?.protocol||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class y{constructor(e,t){this.shortDelay=e,this.longDelay=t,t>e||_("Short delay should be less than long delay!"),this.isMobile=(0,i.uI)()||(0,i.b$)()}get(){return!("undefined"!=typeof navigator&&navigator&&"onLine"in navigator&&"boolean"==typeof navigator.onLine&&("http:"===I()||"https:"===I()||(0,i.ru)()||"connection"in navigator))||navigator.onLine?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class v{static initialize(e,t,r){this.fetchImpl=e,t&&(this.headersImpl=t),r&&(this.responseImpl=r)}static fetch(){return this.fetchImpl?this.fetchImpl:"undefined"!=typeof self&&"fetch"in self?self.fetch:"undefined"!=typeof globalThis&&globalThis.fetch?globalThis.fetch:"undefined"!=typeof fetch?fetch:void _("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){return this.headersImpl?this.headersImpl:"undefined"!=typeof self&&"Headers"in self?self.Headers:"undefined"!=typeof globalThis&&globalThis.Headers?globalThis.Headers:"undefined"!=typeof Headers?Headers:void _("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){return this.responseImpl?this.responseImpl:"undefined"!=typeof self&&"Response"in self?self.Response:"undefined"!=typeof globalThis&&globalThis.Response?globalThis.Response:"undefined"!=typeof Response?Response:void _("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let b={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"},E=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],w=new y(3e4,6e4);function T(e,t){return e.tenantId&&!t.tenantId?{...t,tenantId:e.tenantId}:t}async function S(e,t,r,n,s={}){return R(e,s,async()=>{let s={},a={};n&&("GET"===t?a=n:s={body:JSON.stringify(n)});let o=(0,i.xO)({key:e.config.apiKey,...a}).slice(1),l=await e._getAdditionalHeaders();l["Content-Type"]="application/json",e.languageCode&&(l["X-Firebase-Locale"]=e.languageCode);let c={method:t,headers:l,...s};return(0,i.L_)()||(c.referrerPolicy="no-referrer"),e.emulatorConfig&&(0,i.Xx)(e.emulatorConfig.host)&&(c.credentials="include"),v.fetch()(await O(e,e.config.apiHost,r,o),c)})}async function R(e,t,r){e._canInitEmulator=!1;let n={...b,...t};try{let t=new P(e),i=await Promise.race([r(),t.promise]);t.clearNetworkTimeout();let s=await i.json();if("needConfirmation"in s)throw A(e,"account-exists-with-different-credential",s);if(i.ok&&!("errorMessage"in s))return s;{let[t,r]=(i.ok?s.errorMessage:s.error.message).split(" : ");if("FEDERATED_USER_ID_ALREADY_LINKED"===t)throw A(e,"credential-already-in-use",s);if("EMAIL_EXISTS"===t)throw A(e,"email-already-in-use",s);if("USER_DISABLED"===t)throw A(e,"user-disabled",s);let a=n[t]||t.toLowerCase().replace(/[_\s]+/g,"-");if(r)throw f(e,a,r);h(e,a)}}catch(t){if(t instanceof i.ZR)throw t;h(e,"network-request-failed",{message:String(t)})}}async function C(e,t,r,n,i={}){let s=await S(e,t,r,n,i);return"mfaPendingCredential"in s&&h(e,"multi-factor-auth-required",{_serverResponse:s}),s}async function O(e,t,r,n){let i=`${t}${r}?${n}`,s=e.config.emulator?/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function(e,t){e.emulator||_("Emulator should always be set here");let{url:r}=e.emulator;return t?`${r}${t.startsWith("/")?t.slice(1):t}`:r}(e.config,i):`${e.config.apiScheme}://${i}`;return E.includes(r)&&(await e._persistenceManagerAvailable,"COOKIE"===e._getPersistenceType())?e._getPersistence()._getFinalTarget(s).toString():s}class P{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((e,t)=>{this.timer=setTimeout(()=>t(d(this.auth,"network-request-failed")),w.get())})}}function A(e,t,r){let n={appName:e.name};r.email&&(n.email=r.email),r.phoneNumber&&(n.phoneNumber=r.phoneNumber);let i=d(e,t,n);return i.customData._tokenResponse=r,i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function N(e){return void 0!==e&&void 0!==e.enterprise}class k{constructor(e){if(this.siteKey="",this.recaptchaEnforcementState=[],void 0===e.recaptchaKey)throw Error("recaptchaKey undefined");this.siteKey=e.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=e.recaptchaEnforcementState}getProviderEnforcementState(e){if(!this.recaptchaEnforcementState||0===this.recaptchaEnforcementState.length)return null;for(let t of this.recaptchaEnforcementState)if(t.provider&&t.provider===e)return function(e){switch(e){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}(t.enforcementState);return null}isProviderEnabled(e){return"ENFORCE"===this.getProviderEnforcementState(e)||"AUDIT"===this.getProviderEnforcementState(e)}isAnyProviderEnabled(){return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")||this.isProviderEnabled("PHONE_PROVIDER")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function D(e,t){return S(e,"GET","/v2/recaptchaConfig",T(e,t))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function L(e,t){return S(e,"POST","/v1/accounts:delete",t)}async function M(e,t){return S(e,"POST","/v1/accounts:lookup",t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function U(e){if(e)try{let t=new Date(Number(e));if(!isNaN(t.getTime()))return t.toUTCString()}catch(e){}}async function x(e,t=!1){let r=(0,i.m9)(e),n=await r.getIdToken(t),s=j(n);g(s&&s.exp&&s.auth_time&&s.iat,r.auth,"internal-error");let a="object"==typeof s.firebase?s.firebase:void 0,o=a?.sign_in_provider;return{claims:s,token:n,authTime:U(F(s.auth_time)),issuedAtTime:U(F(s.iat)),expirationTime:U(F(s.exp)),signInProvider:o||null,signInSecondFactor:a?.sign_in_second_factor||null}}function F(e){return 1e3*Number(e)}function j(e){let[t,r,n]=e.split(".");if(void 0===t||void 0===r||void 0===n)return u("JWT malformed, contained fewer than 3 sections"),null;try{let e=(0,i.tV)(r);if(!e)return u("Failed to decode base64 JWT payload"),null;return JSON.parse(e)}catch(e){return u("Caught error parsing JWT payload as JSON",e?.toString()),null}}function V(e){let t=j(e);return g(t,"internal-error"),g(void 0!==t.exp,"internal-error"),g(void 0!==t.iat,"internal-error"),Number(t.exp)-Number(t.iat)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function H(e,t,r=!1){if(r)return t;try{return await t}catch(t){throw t instanceof i.ZR&&function({code:e}){return"auth/user-disabled"===e||"auth/user-token-expired"===e}(t)&&e.auth.currentUser===e&&await e.auth.signOut(),t}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class B{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,null!==this.timerId&&clearTimeout(this.timerId))}getInterval(e){if(!e)return this.errorBackoff=3e4,Math.max(0,(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5);{let e=this.errorBackoff;return this.errorBackoff=Math.min(2*this.errorBackoff,96e4),e}}schedule(e=!1){if(!this.isRunning)return;let t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){e?.code==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class z{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=U(this.lastLoginAt),this.creationTime=U(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function $(e){let t=e.auth,r=await e.getIdToken(),n=await H(e,M(t,{idToken:r}));g(n?.users.length,t,"internal-error");let i=n.users[0];e._notifyReloadListener(i);let s=i.providerUserInfo?.length?K(i.providerUserInfo):[],a=[...e.providerData.filter(e=>!s.some(t=>t.providerId===e.providerId)),...s],o=e.isAnonymous,l=!(e.email&&i.passwordHash)&&!a?.length;Object.assign(e,{uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:a,metadata:new z(i.createdAt,i.lastLoginAt),isAnonymous:!!o&&l})}async function W(e){let t=(0,i.m9)(e);await $(t),await t.auth._persistUserIfCurrent(t),t.auth._notifyListenersIfCurrent(t)}function K(e){return e.map(({providerId:e,...t})=>({providerId:e,uid:t.rawId||"",displayName:t.displayName||null,email:t.email||null,phoneNumber:t.phoneNumber||null,photoURL:t.photoUrl||null}))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function G(e,t){let r=await R(e,{},async()=>{let r=(0,i.xO)({grant_type:"refresh_token",refresh_token:t}).slice(1),{tokenApiHost:n,apiKey:s}=e.config,a=await O(e,n,"/v1/token",`key=${s}`),o=await e._getAdditionalHeaders();o["Content-Type"]="application/x-www-form-urlencoded";let l={method:"POST",headers:o,body:r};return e.emulatorConfig&&(0,i.Xx)(e.emulatorConfig.host)&&(l.credentials="include"),v.fetch()(a,l)});return{accessToken:r.access_token,expiresIn:r.expires_in,refreshToken:r.refresh_token}}async function q(e,t){return S(e,"POST","/v2/accounts:revokeToken",T(e,t))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class J{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){g(e.idToken,"internal-error"),g(void 0!==e.idToken,"internal-error"),g(void 0!==e.refreshToken,"internal-error");let t="expiresIn"in e&&void 0!==e.expiresIn?Number(e.expiresIn):V(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){g(0!==e.length,"internal-error");let t=V(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return t||!this.accessToken||this.isExpired?(g(this.refreshToken,e,"user-token-expired"),this.refreshToken)?(await this.refresh(e,this.refreshToken),this.accessToken):null:this.accessToken}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){let{accessToken:r,refreshToken:n,expiresIn:i}=await G(e,t);this.updateTokensAndExpiration(r,n,Number(i))}updateTokensAndExpiration(e,t,r){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+1e3*r}static fromJSON(e,t){let{refreshToken:r,accessToken:n,expirationTime:i}=t,s=new J;return r&&(g("string"==typeof r,"internal-error",{appName:e}),s.refreshToken=r),n&&(g("string"==typeof n,"internal-error",{appName:e}),s.accessToken=n),i&&(g("number"==typeof i,"internal-error",{appName:e}),s.expirationTime=i),s}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new J,this.toJSON())}_performRefresh(){return _("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Y(e,t){g("string"==typeof e||void 0===e,"internal-error",{appName:t})}class X{constructor({uid:e,auth:t,stsTokenManager:r,...n}){this.providerId="firebase",this.proactiveRefresh=new B(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=t,this.stsTokenManager=r,this.accessToken=r.accessToken,this.displayName=n.displayName||null,this.email=n.email||null,this.emailVerified=n.emailVerified||!1,this.phoneNumber=n.phoneNumber||null,this.photoURL=n.photoURL||null,this.isAnonymous=n.isAnonymous||!1,this.tenantId=n.tenantId||null,this.providerData=n.providerData?[...n.providerData]:[],this.metadata=new z(n.createdAt||void 0,n.lastLoginAt||void 0)}async getIdToken(e){let t=await H(this,this.stsTokenManager.getToken(this.auth,e));return g(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return x(this,e)}reload(){return W(this)}_assign(e){this!==e&&(g(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(e=>({...e})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){let t=new X({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return t.metadata._copy(this.metadata),t}_onReload(e){g(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let r=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),r=!0),t&&await $(this),await this.auth._persistUserIfCurrent(this),r&&this.auth._notifyListenersIfCurrent(this)}async delete(){if((0,n.rh)(this.auth.app))return Promise.reject(p(this.auth));let e=await this.getIdToken();return await H(this,L(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){let r=t.displayName??void 0,n=t.email??void 0,i=t.phoneNumber??void 0,s=t.photoURL??void 0,a=t.tenantId??void 0,o=t._redirectEventId??void 0,l=t.createdAt??void 0,c=t.lastLoginAt??void 0,{uid:u,emailVerified:h,isAnonymous:d,providerData:f,stsTokenManager:p}=t;g(u&&p,e,"internal-error");let m=J.fromJSON(this.name,p);g("string"==typeof u,e,"internal-error"),Y(r,e.name),Y(n,e.name),g("boolean"==typeof h,e,"internal-error"),g("boolean"==typeof d,e,"internal-error"),Y(i,e.name),Y(s,e.name),Y(a,e.name),Y(o,e.name),Y(l,e.name),Y(c,e.name);let _=new X({uid:u,auth:e,email:n,emailVerified:h,displayName:r,isAnonymous:d,photoURL:s,phoneNumber:i,tenantId:a,stsTokenManager:m,createdAt:l,lastLoginAt:c});return f&&Array.isArray(f)&&(_.providerData=f.map(e=>({...e}))),o&&(_._redirectEventId=o),_}static async _fromIdTokenResponse(e,t,r=!1){let n=new J;n.updateFromServerResponse(t);let i=new X({uid:t.localId,auth:e,stsTokenManager:n,isAnonymous:r});return await $(i),i}static async _fromGetAccountInfoResponse(e,t,r){let n=t.users[0];g(void 0!==n.localId,"internal-error");let i=void 0!==n.providerUserInfo?K(n.providerUserInfo):[],s=!(n.email&&n.passwordHash)&&!i?.length,a=new J;a.updateFromIdToken(r);let o=new X({uid:n.localId,auth:e,stsTokenManager:a,isAnonymous:s});return Object.assign(o,{uid:n.localId,displayName:n.displayName||null,photoURL:n.photoUrl||null,email:n.email||null,emailVerified:n.emailVerified||!1,phoneNumber:n.phoneNumber||null,tenantId:n.tenantId||null,providerData:i,metadata:new z(n.createdAt,n.lastLoginAt),isAnonymous:!(n.email&&n.passwordHash)&&!i?.length}),o}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Z=new Map;function Q(e){e instanceof Function||_("Expected a class definition");let t=Z.get(e);return t?t instanceof e||_("Instance stored in cache mismatched with class"):(t=new e,Z.set(e,t)),t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ee{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){let t=this.storage[e];return void 0===t?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function et(e,t,r){return`firebase:${e}:${t}:${r}`}ee.type="NONE";class er{constructor(e,t,r){this.persistence=e,this.auth=t,this.userKey=r;let{config:n,name:i}=this.auth;this.fullUserKey=et(this.userKey,n.apiKey,i),this.fullPersistenceKey=et("persistence",n.apiKey,i),this.boundEventHandler=t._onStorageEvent.bind(t),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){let e=await this.persistence._get(this.fullUserKey);if(!e)return null;if("string"==typeof e){let t=await M(this.auth,{idToken:e}).catch(()=>void 0);return t?X._fromGetAccountInfoResponse(this.auth,t,e):null}return X._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;let t=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,t)return this.setCurrentUser(t)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,t,r="authUser"){if(!t.length)return new er(Q(ee),e,r);let n=(await Promise.all(t.map(async e=>{if(await e._isAvailable())return e}))).filter(e=>e),i=n[0]||Q(ee),s=et(r,e.config.apiKey,e.name),a=null;for(let r of t)try{let t=await r._get(s);if(t){let n;if("string"==typeof t){let r=await M(e,{idToken:t}).catch(()=>void 0);if(!r)break;n=await X._fromGetAccountInfoResponse(e,r,t)}else n=X._fromJSON(e,t);r!==i&&(a=n),i=r;break}}catch{}let o=n.filter(e=>e._shouldAllowMigration);return i._shouldAllowMigration&&o.length&&(i=o[0],a&&await i._set(s,a.toJSON()),await Promise.all(t.map(async e=>{if(e!==i)try{await e._remove(s)}catch{}}))),new er(i,e,r)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function en(e){let t=e.toLowerCase();if(t.includes("opera/")||t.includes("opr/")||t.includes("opios/"))return"Opera";if(function(e=(0,i.z$)()){return/iemobile/i.test(e)}(t))return"IEMobile";if(t.includes("msie")||t.includes("trident/"))return"IE";{if(t.includes("edge/"))return"Edge";if(function(e=(0,i.z$)()){return/firefox\//i.test(e)}(t))return"Firefox";if(t.includes("silk/"))return"Silk";if(function(e=(0,i.z$)()){return/blackberry/i.test(e)}(t))return"Blackberry";if(function(e=(0,i.z$)()){return/webos/i.test(e)}(t))return"Webos";if(function(e=(0,i.z$)()){let t=e.toLowerCase();return t.includes("safari/")&&!t.includes("chrome/")&&!t.includes("crios/")&&!t.includes("android")}(t))return"Safari";if((t.includes("chrome/")||function(e=(0,i.z$)()){return/crios\//i.test(e)}(t))&&!t.includes("edge/"))return"Chrome";if(function(e=(0,i.z$)()){return/android/i.test(e)}(t))return"Android";let r=e.match(/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/);if(r?.length===2)return r[1]}return"Other"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ei(e,t=[]){let r;switch(e){case"Browser":r=en((0,i.z$)());break;case"Worker":r=`${en((0,i.z$)())}-${e}`;break;default:r=e}let s=t.length?t.join(","):"FirebaseCore-web";return`${r}/JsCore/${n.Jn}/${s}`}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class es{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){let r=t=>new Promise((r,n)=>{try{let n=e(t);r(n)}catch(e){n(e)}});r.onAbort=t,this.queue.push(r);let n=this.queue.length-1;return()=>{this.queue[n]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;let t=[];try{for(let r of this.queue)await r(e),r.onAbort&&t.push(r.onAbort)}catch(e){for(let e of(t.reverse(),t))try{e()}catch(e){}throw this.auth._errorFactory.create("login-blocked",{originalMessage:e?.message})}}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ea(e,t={}){return S(e,"GET","/v2/passwordPolicy",T(e,t))}class eo{constructor(e){let t=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=t.minPasswordLength??6,t.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=t.maxPasswordLength),void 0!==t.containsLowercaseCharacter&&(this.customStrengthOptions.containsLowercaseLetter=t.containsLowercaseCharacter),void 0!==t.containsUppercaseCharacter&&(this.customStrengthOptions.containsUppercaseLetter=t.containsUppercaseCharacter),void 0!==t.containsNumericCharacter&&(this.customStrengthOptions.containsNumericCharacter=t.containsNumericCharacter),void 0!==t.containsNonAlphanumericCharacter&&(this.customStrengthOptions.containsNonAlphanumericCharacter=t.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,"ENFORCEMENT_STATE_UNSPECIFIED"===this.enforcementState&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=e.allowedNonAlphanumericCharacters?.join("")??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){let t={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,t),this.validatePasswordCharacterOptions(e,t),t.isValid&&(t.isValid=t.meetsMinPasswordLength??!0),t.isValid&&(t.isValid=t.meetsMaxPasswordLength??!0),t.isValid&&(t.isValid=t.containsLowercaseLetter??!0),t.isValid&&(t.isValid=t.containsUppercaseLetter??!0),t.isValid&&(t.isValid=t.containsNumericCharacter??!0),t.isValid&&(t.isValid=t.containsNonAlphanumericCharacter??!0),t}validatePasswordLengthOptions(e,t){let r=this.customStrengthOptions.minPasswordLength,n=this.customStrengthOptions.maxPasswordLength;r&&(t.meetsMinPasswordLength=e.length>=r),n&&(t.meetsMaxPasswordLength=e.length<=n)}validatePasswordCharacterOptions(e,t){let r;this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);for(let n=0;n<e.length;n++)r=e.charAt(n),this.updatePasswordCharacterOptionsStatuses(t,r>="a"&&r<="z",r>="A"&&r<="Z",r>="0"&&r<="9",this.allowedNonAlphanumericCharacters.includes(r))}updatePasswordCharacterOptionsStatuses(e,t,r,n,i){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=r)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=n)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=i))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class el{constructor(e,t,r,n){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=r,this.config=n,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new eu(this),this.idTokenSubscription=new eu(this),this.beforeStateQueue=new es(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=l,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=n.sdkClientVersion,this._persistenceManagerAvailable=new Promise(e=>this._resolvePersistenceManagerAvailable=e)}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=Q(t)),this._initializationPromise=this.queue(async()=>{if(!this._deleted&&(this.persistenceManager=await er.create(this,e),this._resolvePersistenceManagerAvailable?.(),!this._deleted)){if(this._popupRedirectResolver?._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch(e){}await this.initializeCurrentUser(t),this.lastNotifiedUid=this.currentUser?.uid||null,this._deleted||(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;let e=await this.assertedPersistence.getCurrentUser();if(this.currentUser||e){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{let t=await M(this,{idToken:e}),r=await X._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(r)}catch(e){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",e),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){if((0,n.rh)(this.app)){let e=this.app.settings.authIdToken;return e?new Promise(t=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(e).then(t,t))}):this.directlySetCurrentUser(null)}let t=await this.assertedPersistence.getCurrentUser(),r=t,i=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();let t=this.redirectUser?._redirectEventId,n=r?._redirectEventId,s=await this.tryRedirectSignIn(e);(!t||t===n)&&s?.user&&(r=s.user,i=!0)}if(!r)return this.directlySetCurrentUser(null);if(!r._redirectEventId){if(i)try{await this.beforeStateQueue.runMiddleware(r)}catch(e){r=t,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(e))}return r?this.reloadAndSetCurrentUserOrClear(r):this.directlySetCurrentUser(null)}return(g(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===r._redirectEventId)?this.directlySetCurrentUser(r):this.reloadAndSetCurrentUserOrClear(r)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch(e){await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await $(e)}catch(e){if(e?.code!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=function(){if("undefined"==typeof navigator)return null;let e=navigator;return e.languages&&e.languages[0]||e.language||null}()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if((0,n.rh)(this.app))return Promise.reject(p(this));let t=e?(0,i.m9)(e):null;return t&&g(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&g(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return(0,n.rh)(this.app)?Promise.reject(p(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return(0,n.rh)(this.app)?Promise.reject(p(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(Q(e))})}_getRecaptchaConfig(){return null==this.tenantId?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();let t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return null===this.tenantId?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){let e=new eo(await ea(this));null===this.tenantId?this._projectPasswordPolicy=e:this._tenantPasswordPolicies[this.tenantId]=e}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new i.LL("auth","Firebase",e())}onAuthStateChanged(e,t,r){return this.registerStateListener(this.authStateSubscription,e,t,r)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,r){return this.registerStateListener(this.idTokenSubscription,e,t,r)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{let r=this.onAuthStateChanged(()=>{r(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){let t={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:await this.currentUser.getIdToken()};null!=this.tenantId&&(t.tenantId=this.tenantId),await q(this,t)}}toJSON(){return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:this._currentUser?.toJSON()}}async _setRedirectUser(e,t){let r=await this.getOrInitRedirectPersistenceManager(t);return null===e?r.removeCurrentUser():r.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){let t=e&&Q(e)||this._popupRedirectResolver;g(t,this,"argument-error"),this.redirectPersistenceManager=await er.create(this,[Q(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){return(this._isInitialized&&await this.queue(async()=>{}),this._currentUser?._redirectEventId===e)?this._currentUser:this.redirectUser?._redirectEventId===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);let e=this.currentUser?.uid??null;this.lastNotifiedUid!==e&&(this.lastNotifiedUid=e,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,r,n){if(this._deleted)return()=>{};let i="function"==typeof t?t:t.next.bind(t),s=!1,a=this._isInitialized?Promise.resolve():this._initializationPromise;if(g(a,this,"internal-error"),a.then(()=>{s||i(this.currentUser)}),"function"==typeof t){let i=e.addObserver(t,r,n);return()=>{s=!0,i()}}{let r=e.addObserver(t);return()=>{s=!0,r()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return g(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=ei(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){let e={"X-Client-Version":this.clientVersion};this.app.options.appId&&(e["X-Firebase-gmpid"]=this.app.options.appId);let t=await this.heartbeatServiceProvider.getImmediate({optional:!0})?.getHeartbeatsHeader();t&&(e["X-Firebase-Client"]=t);let r=await this._getAppCheckToken();return r&&(e["X-Firebase-AppCheck"]=r),e}async _getAppCheckToken(){if((0,n.rh)(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;let e=await this.appCheckServiceProvider.getImmediate({optional:!0})?.getToken();return e?.error&&function(e,...t){c.logLevel<=a.in.WARN&&c.warn(`Auth (${n.Jn}): ${e}`,...t)}(`Error while retrieving App Check token: ${e.error}`),e?.token}}function ec(e){return(0,i.m9)(e)}class eu{constructor(e){this.auth=e,this.observer=null,this.addObserver=(0,i.ne)(e=>this.observer=e)}get next(){return g(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eh{constructor(){this.enterprise=new ed}ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class ed{ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}let ef="NO_RECAPTCHA";class ep{constructor(e){this.type="recaptcha-enterprise",this.auth=ec(e)}async verify(e="verify",t=!1){async function r(e){if(!t){if(null==e.tenantId&&null!=e._agentRecaptchaConfig)return e._agentRecaptchaConfig.siteKey;if(null!=e.tenantId&&void 0!==e._tenantRecaptchaConfigs[e.tenantId])return e._tenantRecaptchaConfigs[e.tenantId].siteKey}return new Promise(async(t,r)=>{D(e,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(n=>{if(void 0===n.recaptchaKey)r(Error("recaptcha Enterprise site key undefined"));else{let r=new k(n);return null==e.tenantId?e._agentRecaptchaConfig=r:e._tenantRecaptchaConfigs[e.tenantId]=r,t(r.siteKey)}}).catch(e=>{r(e)})})}return this.auth.settings.appVerificationDisabledForTesting?new eh().execute("siteKey",{action:"verify"}):new Promise((n,i)=>{r(this.auth).then(r=>{if(!t&&N(window.grecaptcha))!function(t,r,n){let i=window.grecaptcha;N(i)?i.enterprise.ready(()=>{i.enterprise.execute(t,{action:e}).then(e=>{r(e)}).catch(()=>{r(ef)})}):n(Error("No reCAPTCHA enterprise script loaded."))}(r,n,i);else{i(Error("RecaptchaVerifier is only supported in browser"));return}}).catch(e=>{i(e)})})}}async function em(e,t,r,n=!1,i=!1){let s;let a=new ep(e);if(i)s=ef;else try{s=await a.verify(r)}catch(e){s=await a.verify(r,!0)}let o={...t};if("mfaSmsEnrollment"===r||"mfaSmsSignIn"===r){if("phoneEnrollmentInfo"in o){let e=o.phoneEnrollmentInfo.phoneNumber,t=o.phoneEnrollmentInfo.recaptchaToken;Object.assign(o,{phoneEnrollmentInfo:{phoneNumber:e,recaptchaToken:t,captchaResponse:s,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}else if("phoneSignInInfo"in o){let e=o.phoneSignInInfo.recaptchaToken;Object.assign(o,{phoneSignInInfo:{recaptchaToken:e,captchaResponse:s,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}return o}return n?Object.assign(o,{captchaResp:s}):Object.assign(o,{captchaResponse:s}),Object.assign(o,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(o,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),o}async function eg(e,t,r,n,i){if("EMAIL_PASSWORD_PROVIDER"===i){if(!e._getRecaptchaConfig()?.isProviderEnabled("EMAIL_PASSWORD_PROVIDER"))return n(e,t).catch(async i=>{if("auth/missing-recaptcha-token"!==i.code)return Promise.reject(i);{console.log(`${r} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);let i=await em(e,t,r,"getOobCode"===r);return n(e,i)}});{let i=await em(e,t,r,"getOobCode"===r);return n(e,i)}}if("PHONE_PROVIDER"!==i)return Promise.reject(i+" provider is not supported.");if(e._getRecaptchaConfig()?.isProviderEnabled("PHONE_PROVIDER")){let i=await em(e,t,r);return n(e,i).catch(async i=>{if(e._getRecaptchaConfig()?.getProviderEnforcementState("PHONE_PROVIDER")==="AUDIT"&&("auth/missing-recaptcha-token"===i.code||"auth/invalid-app-credential"===i.code)){console.log(`Failed to verify with reCAPTCHA Enterprise. Automatically triggering the reCAPTCHA v2 flow to complete the ${r} flow.`);let i=await em(e,t,r,!1,!0);return n(e,i)}return Promise.reject(i)})}{let i=await em(e,t,r,!1,!0);return n(e,i)}}function e_(e){let t=e.indexOf(":");return t<0?"":e.substr(0,t+1)}function eI(e){if(!e)return null;let t=Number(e);return isNaN(t)?null:t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ey{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return _("not implemented")}_getIdTokenResponse(e){return _("not implemented")}_linkToIdToken(e,t){return _("not implemented")}_getReauthenticationResolver(e){return _("not implemented")}}async function ev(e,t){return S(e,"POST","/v1/accounts:signUp",t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function eb(e,t){return C(e,"POST","/v1/accounts:signInWithPassword",T(e,t))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function eE(e,t){return C(e,"POST","/v1/accounts:signInWithEmailLink",T(e,t))}async function ew(e,t){return C(e,"POST","/v1/accounts:signInWithEmailLink",T(e,t))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eT extends ey{constructor(e,t,r,n=null){super("password",r),this._email=e,this._password=t,this._tenantId=n}static _fromEmailAndPassword(e,t){return new eT(e,t,"password")}static _fromEmailAndCode(e,t,r=null){return new eT(e,t,"emailLink",r)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(e){let t="string"==typeof e?JSON.parse(e):e;if(t?.email&&t?.password){if("password"===t.signInMethod)return this._fromEmailAndPassword(t.email,t.password);if("emailLink"===t.signInMethod)return this._fromEmailAndCode(t.email,t.password,t.tenantId)}return null}async _getIdTokenResponse(e){switch(this.signInMethod){case"password":return eg(e,{returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"},"signInWithPassword",eb,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return eE(e,{email:this._email,oobCode:this._password});default:h(e,"internal-error")}}async _linkToIdToken(e,t){switch(this.signInMethod){case"password":return eg(e,{idToken:t,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"},"signUpPassword",ev,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return ew(e,{idToken:t,email:this._email,oobCode:this._password});default:h(e,"internal-error")}}_getReauthenticationResolver(e){return this._getIdTokenResponse(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function eS(e,t){return C(e,"POST","/v1/accounts:signInWithIdp",T(e,t))}class eR extends ey{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){let t=new eR(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):h("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){let{providerId:t,signInMethod:r,...n}="string"==typeof e?JSON.parse(e):e;if(!t||!r)return null;let i=new eR(t,r);return i.idToken=n.idToken||void 0,i.accessToken=n.accessToken||void 0,i.secret=n.secret,i.nonce=n.nonce,i.pendingToken=n.pendingToken||null,i}_getIdTokenResponse(e){return eS(e,this.buildRequest())}_linkToIdToken(e,t){let r=this.buildRequest();return r.idToken=t,eS(e,r)}_getReauthenticationResolver(e){let t=this.buildRequest();return t.autoCreate=!1,eS(e,t)}buildRequest(){let e={requestUri:"http://localhost",returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{let t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=(0,i.xO)(t)}return e}}class eC{constructor(e){let t=(0,i.zd)((0,i.pd)(e)),r=t.apiKey??null,n=t.oobCode??null,s=/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function(e){switch(e){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}(t.mode??null);g(r&&n&&s,"argument-error"),this.apiKey=r,this.operation=s,this.code=n,this.continueUrl=t.continueUrl??null,this.languageCode=t.lang??null,this.tenantId=t.tenantId??null}static parseLink(e){let t=function(e){let t=(0,i.zd)((0,i.pd)(e)).link,r=t?(0,i.zd)((0,i.pd)(t)).deep_link_id:null,n=(0,i.zd)((0,i.pd)(e)).deep_link_id;return(n?(0,i.zd)((0,i.pd)(n)).link:null)||n||r||t||e}(e);try{return new eC(t)}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eO{constructor(){this.providerId=eO.PROVIDER_ID}static credential(e,t){return eT._fromEmailAndPassword(e,t)}static credentialWithLink(e,t){let r=eC.parseLink(t);return g(r,"argument-error"),eT._fromEmailAndCode(e,r.code,r.tenantId)}}eO.PROVIDER_ID="password",eO.EMAIL_PASSWORD_SIGN_IN_METHOD="password",eO.EMAIL_LINK_SIGN_IN_METHOD="emailLink";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eP{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eA extends eP{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eN extends eA{constructor(){super("facebook.com")}static credential(e){return eR._fromParams({providerId:eN.PROVIDER_ID,signInMethod:eN.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return eN.credentialFromTaggedObject(e)}static credentialFromError(e){return eN.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return eN.credential(e.oauthAccessToken)}catch{return null}}}eN.FACEBOOK_SIGN_IN_METHOD="facebook.com",eN.PROVIDER_ID="facebook.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ek extends eA{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return eR._fromParams({providerId:ek.PROVIDER_ID,signInMethod:ek.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return ek.credentialFromTaggedObject(e)}static credentialFromError(e){return ek.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;let{oauthIdToken:t,oauthAccessToken:r}=e;if(!t&&!r)return null;try{return ek.credential(t,r)}catch{return null}}}ek.GOOGLE_SIGN_IN_METHOD="google.com",ek.PROVIDER_ID="google.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eD extends eA{constructor(){super("github.com")}static credential(e){return eR._fromParams({providerId:eD.PROVIDER_ID,signInMethod:eD.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return eD.credentialFromTaggedObject(e)}static credentialFromError(e){return eD.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return eD.credential(e.oauthAccessToken)}catch{return null}}}eD.GITHUB_SIGN_IN_METHOD="github.com",eD.PROVIDER_ID="github.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eL extends eA{constructor(){super("twitter.com")}static credential(e,t){return eR._fromParams({providerId:eL.PROVIDER_ID,signInMethod:eL.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return eL.credentialFromTaggedObject(e)}static credentialFromError(e){return eL.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;let{oauthAccessToken:t,oauthTokenSecret:r}=e;if(!t||!r)return null;try{return eL.credential(t,r)}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function eM(e,t){return C(e,"POST","/v1/accounts:signUp",T(e,t))}eL.TWITTER_SIGN_IN_METHOD="twitter.com",eL.PROVIDER_ID="twitter.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eU{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,r,n=!1){return new eU({user:await X._fromIdTokenResponse(e,r,n),providerId:ex(r),_tokenResponse:r,operationType:t})}static async _forOperation(e,t,r){return await e._updateTokensIfNecessary(r,!0),new eU({user:e,providerId:ex(r),_tokenResponse:r,operationType:t})}}function ex(e){return e.providerId?e.providerId:"phoneNumber"in e?"phone":null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eF extends i.ZR{constructor(e,t,r,n){super(t.code,t.message),this.operationType=r,this.user=n,Object.setPrototypeOf(this,eF.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:t.customData._serverResponse,operationType:r}}static _fromErrorAndOperation(e,t,r,n){return new eF(e,t,r,n)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ej(e,t,r=!1){var i,s,a,o;if((0,n.rh)(e.app))return Promise.reject(p(e));let l="signIn",c=await (i=e,s=l,a=t,("reauthenticate"===s?a._getReauthenticationResolver(i):a._getIdTokenResponse(i)).catch(e=>{if("auth/multi-factor-auth-required"===e.code)throw eF._fromErrorAndOperation(i,e,s,void 0);throw e})),u=await eU._fromIdTokenResponse(e,l,c);return r||await e._updateCurrentUser(u.user),u}async function eV(e,t){return ej(ec(e),t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eH{constructor(e,t){this.factorId=e,this.uid=t.mfaEnrollmentId,this.enrollmentTime=new Date(t.enrolledAt).toUTCString(),this.displayName=t.displayName}static _fromServerResponse(e,t){return"phoneInfo"in t?eB._fromServerResponse(e,t):"totpInfo"in t?ez._fromServerResponse(e,t):h(e,"internal-error")}}class eB extends null{constructor(e){super("phone",e),this.phoneNumber=e.phoneInfo}static _fromServerResponse(e,t){return new eB(t)}}class ez extends null{constructor(e){super("totp",e)}static _fromServerResponse(e,t){return new ez(t)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function e$(e){let t=ec(e);t._getPasswordPolicyInternal()&&await t._updatePasswordPolicy()}async function eW(e,t,r){if((0,n.rh)(e.app))return Promise.reject(p(e));let i=ec(e),s=eg(i,{returnSecureToken:!0,email:t,password:r,clientType:"CLIENT_TYPE_WEB"},"signUpPassword",eM,"EMAIL_PASSWORD_PROVIDER"),a=await s.catch(t=>{throw"auth/password-does-not-meet-requirements"===t.code&&e$(e),t}),o=await eU._fromIdTokenResponse(i,"signIn",a);return await i._updateCurrentUser(o.user),o}function eK(e,t,r){return(0,n.rh)(e.app)?Promise.reject(p(e)):eV((0,i.m9)(e),eO.credential(t,r)).catch(async t=>{throw"auth/password-does-not-meet-requirements"===t.code&&e$(e),t})}function eG(e,t,r,n){return(0,i.m9)(e).onAuthStateChanged(t,r,n)}function eq(e){return(0,i.m9)(e).signOut()}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eJ{constructor(e,t,r){this.type=e,this.credential=t,this.user=r}static _fromIdtoken(e,t){return new eJ("enroll",e,t)}static _fromMfaPendingCredential(e){return new eJ("signin",e)}toJSON(){return{multiFactorSession:{["enroll"===this.type?"idToken":"pendingCredential"]:this.credential}}}static fromJSON(e){if(e?.multiFactorSession){if(e.multiFactorSession?.pendingCredential)return eJ._fromMfaPendingCredential(e.multiFactorSession.pendingCredential);if(e.multiFactorSession?.idToken)return eJ._fromIdtoken(e.multiFactorSession.idToken)}return null}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eY{constructor(e,t,r){this.session=e,this.hints=t,this.signInResolver=r}static _fromError(e,t){let r=ec(e),n=t.customData._serverResponse,i=(n.mfaInfo||[]).map(e=>eH._fromServerResponse(r,e));g(n.mfaPendingCredential,r,"internal-error");let s=eJ._fromMfaPendingCredential(n.mfaPendingCredential);return new eY(s,i,async e=>{let i=await e._process(r,s);delete n.mfaInfo,delete n.mfaPendingCredential;let a={...n,idToken:i.idToken,refreshToken:i.refreshToken};switch(t.operationType){case"signIn":let o=await eU._fromIdTokenResponse(r,t.operationType,a);return await r._updateCurrentUser(o.user),o;case"reauthenticate":return g(t.user,r,"internal-error"),eU._forOperation(t.user,t.operationType,a);default:h(r,"internal-error")}})}async resolveSignIn(e){return this.signInResolver(e)}}class eX{constructor(e){this.user=e,this.enrolledFactors=[],e._onReload(t=>{t.mfaInfo&&(this.enrolledFactors=t.mfaInfo.map(t=>eH._fromServerResponse(e.auth,t)))})}static _fromUser(e){return new eX(e)}async getSession(){return eJ._fromIdtoken(await this.user.getIdToken(),this.user)}async enroll(e,t){let r=await this.getSession(),n=await H(this.user,e._process(this.user.auth,r,t));return await this.user._updateTokensIfNecessary(n),this.user.reload()}async unenroll(e){let t="string"==typeof e?e:e.uid,r=await this.user.getIdToken();try{var n;let e=await H(this.user,(n=this.user.auth,S(n,"POST","/v2/accounts/mfaEnrollment:withdraw",T(n,{idToken:r,mfaEnrollmentId:t}))));this.enrolledFactors=this.enrolledFactors.filter(({uid:e})=>e!==t),await this.user._updateTokensIfNecessary(e),await this.user.reload()}catch(e){throw e}}}new WeakMap;var eZ="@firebase/auth",eQ="1.12.1";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class e0{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){return this.assertAuthConfigured(),this.auth.currentUser?.uid||null}async getToken(e){return(this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser)?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;let t=this.auth.onIdTokenChanged(t=>{e(t?.stsTokenManager.accessToken||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();let t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){g(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}function e1(e=(0,n.Mq)()){let t=(0,n.qX)(e,"auth");if(t.isInitialized())return t.getImmediate();let r=/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function(e,t){let r=(0,n.qX)(e,"auth");if(r.isInitialized()){let e=r.getImmediate(),n=r.getOptions();if((0,i.vZ)(n,t??{}))return e;h(e,"already-initialized")}return r.initialize({options:t})}(e),s=(0,i.q4)("auth");return s&&function(e,t,r){let n=ec(e);g(/^https?:\/\//.test(t),n,"invalid-emulator-scheme");let s=e_(t),{host:a,port:o}=function(e){let t=e_(e),r=/(\/\/)?([^?#/]+)/.exec(e.substr(t.length));if(!r)return{host:"",port:null};let n=r[2].split("@").pop()||"",i=/^(\[[^\]]+\])(:|$)/.exec(n);if(i){let e=i[1];return{host:e,port:eI(n.substr(e.length+1))}}{let[e,t]=n.split(":");return{host:e,port:eI(t)}}}(t),l=null===o?"":`:${o}`,c={url:`${s}//${a}${l}/`},u=Object.freeze({host:a,port:o,protocol:s.replace(":",""),options:Object.freeze({disableWarnings:!1})});if(!n._canInitEmulator){g(n.config.emulator&&n.emulatorConfig,n,"emulator-config-failed"),g((0,i.vZ)(c,n.config.emulator)&&(0,i.vZ)(u,n.emulatorConfig),n,"emulator-config-failed");return}n.config.emulator=c,n.emulatorConfig=u,n.settings.appVerificationDisabledForTesting=!0,(0,i.Xx)(a)?((0,i.Uo)(`${s}//${a}${l}`),(0,i.dp)("Auth",!0)):"undefined"!=typeof console&&"function"==typeof console.info&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials.")}(r,`http://${s}`),r}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */v.initialize(fetch,Headers,Response),function(e){(0,n.Xd)(new s.wA("auth",(t,{options:r})=>{let n=t.getProvider("app").getImmediate(),i=t.getProvider("heartbeat"),s=t.getProvider("app-check-internal"),{apiKey:a,authDomain:o}=n.options;g(a&&!a.includes(":"),"invalid-api-key",{appName:n.name});let l=new el(n,i,s,{apiKey:a,authDomain:o,clientPlatform:e,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:ei(e)});return function(e,t){let r=t?.persistence||[],n=(Array.isArray(r)?r:[r]).map(Q);t?.errorMap&&e._updateErrorMap(t.errorMap),e._initializeWithPersistence(n,t?.popupRedirectResolver)}(l,r),l},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,r)=>{e.getProvider("auth-internal").initialize()})),(0,n.Xd)(new s.wA("auth-internal",e=>new e0(ec(e.getProvider("auth").getImmediate())),"PRIVATE").setInstantiationMode("EXPLICIT")),(0,n.KN)(eZ,eQ,/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function(e){switch(e){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}(e)),(0,n.KN)(eZ,eQ,"esm2020")}("Node"),d("operation-not-supported-in-this-environment"),el.prototype.setPersistence=async()=>{};class e6{constructor(e){this.factorId=e}_process(e,t,r){switch(t.type){case"enroll":return this._finalizeEnroll(e,t.credential,r);case"signin":return this._finalizeSignIn(e,t.credential);default:return _("unexpected MultiFactorSessionType")}}}class e2{static assertionForEnrollment(e,t){return e3._fromSecret(e,t)}static assertionForSignIn(e,t){return e3._fromEnrollmentId(e,t)}static async generateSecret(e){var t;g(void 0!==e.user?.auth,"internal-error");let r=await S(t=e.user.auth,"POST","/v2/accounts/mfaEnrollment:start",T(t,{idToken:e.credential,totpEnrollmentInfo:{}}));return e4._fromStartTotpMfaEnrollmentResponse(r,e.user.auth)}}e2.FACTOR_ID="totp";class e3 extends e6{constructor(e,t,r){super("totp"),this.otp=e,this.enrollmentId=t,this.secret=r}static _fromSecret(e,t){return new e3(t,void 0,e)}static _fromEnrollmentId(e,t){return new e3(t,e)}async _finalizeEnroll(e,t,r){return g(void 0!==this.secret,e,"argument-error"),S(e,"POST","/v2/accounts/mfaEnrollment:finalize",T(e,{idToken:t,displayName:r,totpVerificationInfo:this.secret._makeTotpVerificationInfo(this.otp)}))}async _finalizeSignIn(e,t){g(void 0!==this.enrollmentId&&void 0!==this.otp,e,"argument-error");let r={verificationCode:this.otp};return S(e,"POST","/v2/accounts/mfaSignIn:finalize",T(e,{mfaPendingCredential:t,mfaEnrollmentId:this.enrollmentId,totpVerificationInfo:r}))}}class e4{constructor(e,t,r,n,i,s,a){this.sessionInfo=s,this.auth=a,this.secretKey=e,this.hashingAlgorithm=t,this.codeLength=r,this.codeIntervalSeconds=n,this.enrollmentCompletionDeadline=i}static _fromStartTotpMfaEnrollmentResponse(e,t){return new e4(e.totpSessionInfo.sharedSecretKey,e.totpSessionInfo.hashingAlgorithm,e.totpSessionInfo.verificationCodeLength,e.totpSessionInfo.periodSec,new Date(e.totpSessionInfo.finalizeEnrollmentTime).toUTCString(),e.totpSessionInfo.sessionInfo,t)}_makeTotpVerificationInfo(e){return{sessionInfo:this.sessionInfo,verificationCode:e}}generateQrCodeUrl(e,t){let r=!1;return(e5(e)||e5(t))&&(r=!0),r&&(e5(e)&&(e=this.auth.currentUser?.email||"unknownuser"),e5(t)&&(t=this.auth.name)),`otpauth://totp/${t}:${e}?secret=${this.secretKey}&issuer=${t}&algorithm=${this.hashingAlgorithm}&digits=${this.codeLength}`}}function e5(e){return void 0===e||e?.length===0}}};