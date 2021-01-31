const sinon = require('sinon')

module.exports = () => {
	jest.spyOn(window.history, 'replaceState')
	jest.spyOn(window.history, 'pushState')

	const oldWindowLocation = window.location
	beforeEach(() => {
	    delete window.location
	    const openStub = sinon.stub()
	    window.location = new URL('http://localhost/')
	    window.open = openStub

	    window.history.replaceState.mockImplementation((state, title, url) => {
	        window.location = new URL('http://localhost/' + url)
	    	window.location.open = openStub
	    })

	    window.history.pushState.mockImplementation((state, title, url) => {
	        window.location = new URL('http://localhost/' + url)
	       	window.location.open = openStub
	    })
	})

    afterEach(() => {
        window.location = oldWindowLocation
    })
}