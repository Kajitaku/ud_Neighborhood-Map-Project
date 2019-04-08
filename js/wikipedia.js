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
export default wikipedia;
