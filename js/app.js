//my list of places
var initialMarkers = [
  {
    name: 'Twitter',
    address: '1355 Market St, San Francisco, CA 94103',
    latitude: 37.776946, 
    longitude: -122.416740,
    marker: ''
  },
  {
    name: 'Ubisoft',
    address: '625 3rd St, San Francisco, CA 94107',
    latitude: 37.779999, 
    longitude: -122.393455,
    marker: ''
  },
  {
    name: 'LinkedIn',
    address: '505 Howard St, San Francisco, CA 94105',
    latitude: 37.786772, 
    longitude: -122.398122,
    marker: ''
  },
  {
    name: 'Salesforce',
    address: '50 Fremont St, San Francisco, CA 94105',
    latitude: 37.7906035,
    longitude: -122.3994006,
    marker: ''
  },
  {
    name: 'LiveJournal',
    address: '24th St, San Francisco, CA 94131',
    latitude: 37.7513496,
    longitude:  -122.4340457,
    marker: ''
  },
  {
    name: 'Zendesk',
    address: '1019 Market St, San Francisco, CA 94103',
    website: 'zendesk.com',
    latitude: 37.7816369,
    longitude: -122.4126974,
    marker: ''
  }
];

//Build Place data using ko.observable so data is updated in real time when changed
var Place = function (data) {
  this.name = ko.observable(data.name);
  this.address = ko.observable(data.address);
  this.website = ko.observable(data.website);
  this.latitude = ko.observable(data.latitude);
  this.longitude = ko.observable(data.longitude);
  this.marker = '';
};

////**View Model**////

//Set global variables for map functions
//simplified piece of code
var map="map",
    infoWindow="infoWindow",
    marker="marker";

//Create callback function for Google map async load
function initMap () {
//Create View Model main function
    var AppViewModel = function () {

  //Function to assist with filteredPlaces list by checking the beginning of string searched
        var stringStartsWith = function (string, startsWith) {
        string = string || "";
        if (startsWith.length > string.length) {
        return false;
        }
        return string.substring(0, startsWith.length) === startsWith;
        };


  //Variable to keep references of "this" inside the View Model
  var self = this;

  //Create map centered on San Francisco, CA
  var mapOptions = {
    zoom: 12,
    center: {lat: 37.776946, lng: -122.416740}
  };

  map = new google.maps.Map(document.getElementById("map"),
      mapOptions);

  //Event listener to cause map to resize and remain centered in response to a window resize
  google.maps.event.addDomListener(window, "resize", function() {
      var center = map.getCenter();
      google.maps.event.trigger(map, "resize");
      map.setCenter(center);
  });

  //Observable array for markers
  self.markerArray = ko.observableArray(initialMarkers);

  //Create markers that populate on the map and correspond to the locations identified in the initialMarkers array
  self.markerArray().forEach(function(placeItem) {
    marker = new google.maps.Marker({
      position: new google.maps.LatLng(placeItem.latitude, placeItem.longitude),
      map: map,
      title: placeItem.name,
      animation: google.maps.Animation.DROP
    });

    placeItem.marker = marker;

    //Add bounce animation to markers when clicked or selected from list
    placeItem.marker.addListener('click', toggleBounce);

//number of bounces-2
    function toggleBounce() {
      if (placeItem.marker.getAnimation() !== null) {
        placeItem.marker.setAnimation(null);
      } else {
        placeItem.marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function(){ placeItem.marker.setAnimation(null); }, 1400);
      }
    }

    //Variables for use in contentString for infowindows
    var windowNames = placeItem.name;
    var windowAddresses = placeItem.address;

    //New infowindow
    infoWindow = new google.maps.InfoWindow();

    //Event listener to open infowindow when marker is clicked
    google.maps.event.addListener(placeItem.marker, 'click', function() {
          //Create contentString variable for infowindows
          var contentString;

          //Alter placeItem.name content to account for symbols and spaces
          var alteredName = encodeURI(placeItem.name);

          //Wikipedia API request URL
          var wikiUrl = "http://en.wikipedia.org/w/api.php?action=opensearch&format=json&search=" + alteredName + "&limit=1&redirects=return&format=json";

          var wikiRequestTimeout = setTimeout(function(){
           $wikiElem.text("failed to get Wikipedia articles");
          }, 8000);

          //AJAX request for Wikipedia API information used in infowindows
          $.ajax ({
            url: wikiUrl,
            dataType: "jsonp",
            success: function ( response ){
              var articleList = response[1];
              //If an article is found, populate infowindow with content string information showing Wikipedia response
              if (articleList.length > 0) {
                for (var i=0; i<articleList.length; i++) {
                  articleStr = articleList[i];
                  var url = 'http://en.wikipedia.org/wiki/' + articleStr;
                  //Now reference opens in a new tab
                  contentString = '<div id="content">' + windowNames + '<p>' + windowAddresses + '</p>' + '<p>' + response[2] + '</p>' + '<a href=" ' + url + '" target="_blank">' + url + '</a>' + '</div>';
                  infoWindow.setContent(contentString);
                  console.log(response);
                }
                console.log(wikiUrl);
              //If no article is found, populate infowindow with content string reflecting no articles were found
              } else {
                contentString = '<div id="content">' + windowNames + '<p>' + windowAddresses + '</p>' + '<p>' + 'No articles found on Wikipedia'+ '</p>' + '</div>';
                infoWindow.setContent(contentString);
              }
            }
          //Communicate error when Wikipedia API is unable to be reached or is not available
          }).fail(function(e){
            contentString = '<div id="content">' + windowNames + '<p>' + windowAddresses + '</p>' + '<p>' + 'Failed to reach Wikipedia'+ '</p>' + '</div>';
            infoWindow.setContent(contentString);
          });
          clearTimeout(wikiRequestTimeout);
      //Call to open the infowindow
      console.log("clicked");
      infoWindow.open(map, this);
    });
  });

  //Function to connect marker triggers to list selection, allows markers to animate and infowindows to open when list is clicked
  self.markerTrigger = function(marker) {
        google.maps.event.trigger(this.marker, 'click');
  };

  //Create observable for information typed into the search bar
  self.query= ko.observable('');

  //Create a ko.computed for the filtering of the list and the markers
  self.filteredPlaces = ko.computed(function(placeItem) {
    var filter = self.query().toLowerCase();
    //If there is nothing in the filter, return the full list and all markers are visible
    if (!filter) {
      self.markerArray().forEach(function(placeItem) {
          placeItem.marker.setVisible(true);
        });
      return self.markerArray();
    //If a search is entered, compare search data to place names and show only list items and markers that match the search value
    } else {
        return ko.utils.arrayFilter(self.markerArray(), function(placeItem) {
          is_filtered = stringStartsWith(placeItem.name.toLowerCase(), filter);
          //Show markers that match the search value and return list items that match the search value
          var is_filtered;
           if (is_filtered) {
              placeItem.marker.setVisible(true);
              console.log("clicked");
              return is_filtered;
            }
          //Hide markers that do not match the search value
           else {
              placeItem.marker.setVisible(false);
              return is_filtered;
            }
        });
      }
  }, self);
};

//Call the AppViewModel function
ko.applyBindings(new AppViewModel());
}
