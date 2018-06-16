/**
 * @description View object to render.
 */
let view = {

  /**
   * @description map's center LatLng
   * @type {google.maps.LatLng}
   */
  center: new google.maps.LatLng(41.48, -81.67),

  /**
   * @description initialize for google map
   */
  init: function() {
    // when custom bind 'googlemap' was initialized,
    // this init method is called.
    this.map = new google.maps.Map(document.getElementById('map'), {
      zoom: 10,
      center: this.center,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });
    this.infowindow = new google.maps.InfoWindow();
    this.autocomplete = new google.maps.places.Autocomplete(
      document.getElementById('location'), {
        types: ['establishment']
      }
    );

    // Style the markers a bit. This will be our listing marker icon.
    this.defaultIcon = this.makeMarkerIcon('FF0000');

    // Create a "highlighted location" marker color for when the user
    // mouses over the marker.
    this.highlightedIcon = this.makeMarkerIcon('FFFF24');

    // when infoWindow is open, the marker is blue.
    this.blueIcon = this.makeMarkerIcon('0000FF');

    // if a user searches a location by autocomplete,
    // move map's center to there and set observable location it.
    let self = this;
    this.autocomplete.addListener('place_changed', function() {
      let location = this.getPlace().geometry.location;
      providersViewModel.location(location);
      self.map.setCenter(location);
    });
  },

  /**
   * @description adjust map bounds and render it
   */
  render: function() {
    let filteredProviders = providersViewModel.filteredProviders();

    // if providers' count is 0 and fit map to bounds,
    // map fits to unintented location. So check the count.

    if (filteredProviders.length == 0) {
      return;
    }
    let self = this;
    let bounds = new google.maps.LatLngBounds();
    filteredProviders.map(function(provider) {

      // expand map bounds to show all markers.
      bounds.extend(provider.marker.position);

      // add event to pop up infowindow when marker was clicked.
      provider.marker.addListener('click', function() {
        self.populateInfoWindow(provider);
      });
    });

    // fit google map to expanded bounds.
    this.map.fitBounds(bounds);
  },

  /**
   * @description set a google map's center location to a provider location.
   * @param {object} provider
   */
  centerize: function(provider) {
    let location = {
      lat: parseFloat(provider.point.lat),
      lng: parseFloat(provider.point.long)
    };
    this.map.setCenter(location);
  },

  /**
   * @description populate info window on a marker
   * @param {object} provider
   */
  populateInfoWindow: function(provider) {
    let marker = provider.marker;
    if (this.infowindow.marker != marker) {

      // When marker is already clicked and then
      // different marker is clicked without using closeclick event,
      // a former merker is still blue color means clicked.
      // So we have to reset the color.
      if (this.infowindow.marker != undefined) {
        this.infowindow.marker.setIcon(this.defaultIcon);
      }
      this.infowindow.marker = marker;
      this.infowindow.provider = provider;
      this.infowindow.marker.setIcon(this.blueIcon);

      // get a wikipedia image
      wikipedia.setImage(this.infowindow);
      this.infowindow.open(this.map, marker);
      // Make sure the marker property is cleared if the infowindow is closed.
      let self = this;
      this.infowindow.addListener('closeclick', function() {
        this.marker.setIcon(self.defaultIcon);
        this.setMarker = null;
      });
    }
  },

  /**
   * @description This function takes in a COLOR, and then creates a new marker
   * icon of that color. The icon will be 21 px wide by 34 high, have an origin
   * of 0, 0 and be anchored at 10, 34).
   * @param {string} markerColor
   * @return {google.maps.MarkerImage} marker's icon
   */
  makeMarkerIcon: function(markerColor) {
    let markerImage = new google.maps.MarkerImage(
      'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|' + markerColor +
      '|40|_|%E2%80%A2',
      new google.maps.Size(21, 34),
      new google.maps.Point(0, 0),
      new google.maps.Point(10, 34),
      new google.maps.Size(21, 34)
    );
    return markerImage;
  }
}

/**
 * @description object for wikipedia
 */
let wikipedia = {

  /**
   * @description get images from wikipedia page
   * @param {string} title
   * @returns {Promise} Promise object represents the images data
   */
  getImages: function(title) {
    let d = new $.Deferred();
    $.ajax({
      type: 'get',
      url: 'http://en.wikipedia.org/w/api.php',
      dataType: 'jsonp',
      contentType: 'jsonp',
      data: {
        format: 'json',
        action: 'query',
        prop: 'images',
        titles: title
      },
      cache: true,
      success: function(data) {
        let pageIds = Object.keys(data.query.pages);
        if (pageIds[0] == -1) {
          d.reject('Could not find a wikipedia page');
        } else {
          let images = data.query.pages[pageIds[0]].images;
          if (images && images.length > 0) {
            d.resolve(images);
          } else {
            d.reject('Could not fetch wikipedia images');
          }
        }
      },
      error: function(XMLHttpRequest, textStatus, errorThrown) {
        d.reject("Something failed to fetch wikipedia's images");
      }
    });
    return d.promise();
  },

  /**
   * @description get image info from wikipedia image
   * @param {object} image
   * @returns {Promise} Promise object represents the image info
   */
  getImageInfo: function(image) {
    return $.ajax({
      type: 'get',
      url: 'http://en.wikipedia.org/w/api.php',
      dataType: 'jsonp',
      contentType: 'jsonp',
      data: {
        format: 'json',
        action: 'query',
        prop: 'imageinfo',
        iiprop: 'url',
        titles: image.title.replace('File:', 'Image:')
      },
      cache: true
    });
  },

  /**
   * @description set wikipedia image on info window
   * @param {google.maps.InfoWindow} infoWindow
   */
  setImage: function(infoWindow) {
    let self = this;

    // set current session to avoid async race conditions
    const currentSession = {};
    self.lastSession = currentSession;

    let title = infoWindow.marker.title;
    this.getImages(title)
      .then(
        function(images) {
          // check async race conditions
          if (self.lastSession !== currentSession) {
            return;
          }
          return self.getImageInfo(images[0]);
        },
        function(error) {
          // check async race conditions
          if (self.lastSession !== currentSession) {
            return;
          }
          throw error;
        }
      )
      .then(
        function(res) {
          // check async race conditions
          if (self.lastSession !== currentSession) {
            return;
          }
          let imageInfo = res.query.pages["-1"].imageinfo;
          let content = '<img width=100 height=100 src="' + imageInfo[0].url + '"</img>';
          self.setContent(content, infoWindow);
        },
        function(XMLHttpRequest, textStatus, errorThrown) {
          // check async race conditions
          if (self.lastSession !== currentSession) {
            return;
          }
          let e;
          if (textStatus == undefined) {
            e = XMLHttpRequest
          } else if (XMLHttpRequest.status == 404) {
            e = " Wikipedia image info not found.";
          }
          let content = '<p>' + e + '</p>';
          self.setContent(content, infoWindow);
        }
      );
  },

  /**
   * @description set content to infowindow with a wikipedia image
   * @param {string} content
   * @param {google.maps.InfoWindow} infoWindow
   */
  setContent: function(content, infoWindow) {
    let body = '<h3>' + infoWindow.marker.title + '</h3>';
    body += content;
    let provider = infoWindow.provider;
    let url = provider.link;
    body += '<p> URL: <a href="' + url + '">' + url + '</a></p>';
    let address = provider.streetAddress + provider.locality;
    body += '<p> Address: ' + address + '</p>';
    body += '<p> TEL: ' + provider.telephone + '</p>';
    body += '<p> TYPE: ' + provider.serviceType + '</p>';
    infoWindow.setContent(body);
  }
};

/**
 * @description HIV/AIDS Prevention & Service Provider's view model
 * @constructor
 */
function ProvidersViewModel() {
  let self = this;

  /**
   * @description @description provider service type
   * @type {string}
   */
  self.service = ko.observable('');

  /**
   * @description filter text for providers
   * @type {string}
   */
  self.filter = ko.observable('');

  /**
   * @description location where search providers
   * @type {google.maps.LatLng}
   */
  self.location = ko.observable(view.center);

  /**
   * @description HIV/AIDS Prevention & Service Providers
   * @type {array}
   */
  self.providers = ko.observableArray([]);

  /**
   * @description filterd Service Provider
   * @type {array}
   */
  self.filteredProviders = ko.observableArray([]);

  /**
   * @description initialize method
   */
  self.init = function() {
    view.init();
  };

  /**
   * @description update filterd providers and set markers on map.
   */
  self.update = function() {
    self.setFilteredProviders();
    self.putMarkers();
    view.render();
  };

  /**
   * @description set filterd providers to observableArray
   */
  self.setFilteredProviders = function() {
    let service = self.service();
    let filter = self.filter();
    let providers = self.providers();

    if (filter != '') {
      providers = ko.utils.arrayFilter(
        providers,
        function(provider) {
          return provider.title.indexOf(filter) != -1;
        });
    }

    if (service != '') {
      providers = ko.utils.arrayFilter(
        providers,
        function(provider) {
          return provider.serviceType == service;
        });
    }
    self.filteredProviders(providers);
  };

  /**
   * @description focus on a provider's location on map
   * @param {object} provider
   */
  self.focus = function(provider) {
    view.centerize(provider);
    view.populateInfoWindow(provider);
  };

  /**
   * @description put filtered provider's markers on map
   */
  self.putMarkers = function() {
    // actually, set visible to filtered provider's markers
    // and set unvisible to the others.
    let providers = self.providers();
    let filteredProviders = self.filteredProviders();
    providers.map(function(provider, index) {
      if (filteredProviders.includes(provider)) {
        provider.marker.setVisible(true);
      } else {
        provider.marker.setVisible(false);
      }
    });
  };

  /**
   * @description get provider's marker
   * @param {object} provider
   * @return {google.maps.Marker}
   */
  self.getMarker = function(provider) {
    let marker = new google.maps.Marker({
      map: view.map,
      position: {
        // these lat and long are string
        // so converted to float.
        lat: parseFloat(provider.point.lat),
        lng: parseFloat(provider.point.long)
      },
      title: provider.title
    });

    marker.addListener('mouseover', function() {
      // if marker is blue of when infoWindow is open,
      // keep the color
      if (this.getIcon() && this.getIcon().url == view.blueIcon.url) {
        return;
      }
      this.setIcon(view.highlightedIcon);
    });

    marker.addListener('mouseout', function() {
      // if marker is blue of when infoWindow is open,
      // keep the color
      if (this.getIcon() && this.getIcon().url == view.blueIcon.url) {
        return;
      }
      this.setIcon(view.defaultIcon);
    });

    return marker;
  };

  ko.computed(function() {
    // when location was changed by autocomplete,
    // observable providers is reloaded.

    let location = self.location();
    let data = {
      lat: location.lat(),
      long: location.lng()
    };

    $.ajax({
        type: 'get',
        url: 'https://locator.hiv.gov/data',
        dataType: 'jsonp',
        contentType: 'jsonp',
        data,
        cache: true
      })
      .then(
        function(res) {
          let providers = [];
          res.services.map(function(service) {
            service.providers.map(function(provider) {
              provider.marker = self.getMarker(provider);
              provider.serviceType = service.serviceType;
              providers.push(provider);
            });
          });
          self.providers(providers);
        },
        function(XMLHttpRequest, textStatus, errorThrown) {
          let msg = "Can not reach resource site.";
          if (XMLHttpRequest.status == 404) {
            msg += " Site not found.";
          }
          alert(msg);
        }
      );
  });
};

let providersViewModel = new ProvidersViewModel();

/**
 * custom binding for google map
 */
ko.bindingHandlers.googlemap = {

  /**
   * @description when this bind binded to DOM, this method is invoked.
   */
  init: function(element, valueAccessor, allBindings, providersViewModel) {
    providersViewModel.init();
  },

  /**
   * @description when filter is updated, this method is invoked.
   */
  update: function(element, valueAccessor, allBindings, providersViewModel) {
    let value = valueAccessor();

    // Just to trigger this update method,
    // get these values. Not to use here.
    let filter = value.filter();
    let service = value.service();
    providersViewModel.update();
  }
};

ko.applyBindings(providersViewModel);
