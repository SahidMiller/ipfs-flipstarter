module.exports =  [{
	name: 'ipfs',
	var: 'Ipfs',
	path: 'dist/index.min.js',
	prodUrl: 'https://cdn.jsdelivr.net/npm/:name/:path',
	crossOrigin: 'anonymous',
	sri: true
}, {
	name: 'jquery',
	var: '$',
	prodUrl: 'https://code.jquery.com/jquery-3.5.1.slim.min.js',
	crossOrigin: 'anonymous',
	sri: true
}, {
	name: 'bootstrap',
	prodUrl: 'https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/:path',
	crossOrigin: 'anonymous',
	path: 'js/bootstrap.min.js',
	style: "css/bootstrap.min.css",
	sri: true
}, {
	name: 'popper.js',
	var: 'Popper',
	prodUrl: 'https://cdn.jsdelivr.net/npm/popper.js@1.16.0/dist/umd/popper.min.js',
	crossOrigin: 'anonymous',
	sri: true
}]