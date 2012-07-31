/*
    Heavily inspired by the original js library copyright Mixpanel, Inc.
    (http://mixpanel.com/)

    Modifications by Carl Sverre
*/

var http            = require('http'),
    querystring     = require('querystring'),
    Buffer          = require('buffer').Buffer;

var client = function(token, config) {
    var metrics = {};
    
    if(!token) {
        throw new Error("The Mixpanel Client needs a Mixpanel token");
    }
    
    metrics.config = {
        test: false,
        debug: false
    };
    
    metrics.properties = {
        distinct_id: null,
        name_tag: null
    };
    
    metrics.token = token;
    
    // private utility function
    var get_unixtime = function() {
        return parseInt(new Date().getTime().toString().substring(0,10), 10);
    };
    
    /**
        send_request(data)
        ---
        this function sends an async GET request to mixpanel
        
        data:object                     the data to send in the request
        callback:function(err:Error)    callback is called when the request is
                                        finished or an error occurs
    */
    metrics.send_request = function(url, data, callback) {
        callback = callback || function() {};
        var event_data = new Buffer(JSON.stringify(data));
        var request_data = {
            'data': event_data.toString('base64'),
            'ip': 0
        };
        
        var request_options = {
            host: 'api.mixpanel.com',
            port: 80,
            headers: {}
        };
    
        if (metrics.config.test) { request_data.test = 1; }
        
        var query = querystring.stringify(request_data);
        
        request_options.path = [url,"?",query].join("");
        
        http.get(request_options, function(res) {
            var data = "";
            res.on('data', function(chunk) {
               data += chunk;
            });
            
            res.on('end', function() {
                var e = (data != '1') ? new Error("Mixpanel Server Error: " + data) : undefined;
                callback(e);
            });
        }).on('error', function(e) {
            if(metrics.config.debug) {
                console.log("Got Error: " + e.message);
            }
            callback(e);
        });
    };
    
    /**
        track(event, properties, callback)
        ---
        this function sends an event to mixpanel
        
        event:string                    the event name
        properties:object               additional event properties to send
        callback:function(err:Error)    callback is called when the request is
                                        finished or an error occurs
    */
    metrics.track = function(event, properties, callback) {
        if (!properties) { properties = {}; }
        if (!properties.token) { properties.token = metrics.token; }
        if (!properties.time) { properties.time = get_unixtime(); }

        if (metrics.properties.distinct_id !== null) {
            properties.distinct_id = metrics.properties.distinct_id;
        }

        if (metrics.properties.name_tag !== null) {
            properties.mp_name_tag = metrics.properties.name_tag;
        }

        var data = {
            'event' : event,
            'properties' : properties
        };
        
        if(metrics.config.debug) {
            console.log("Sending the following event to Mixpanel:");
            console.log(data);
        }
        
        metrics.send_request("/track", data,callback);
    };

    metrics.engage = function (properties, callback) {
        if (!properties) { properties = {}; }
        if (!properties.$token) { properties.$token = metrics.token; }

        if (metrics.config.debug) {
            console.log("Sending the following engage to Mixpanel:")
            console.log(properties)
        }

        metrics.send_request("/engage", properties, callback)
    };

    /**
        identify(uniqueID)
        ---
        Identify a user with a unique id.  All subsequent
        actions caused by this user will be tied to this identity.  This
        property is used to track unique visitors.

        uniqueID:string               uniquely identifies the user
    */
    metrics.identify = function(uniqueID) {
        metrics.properties.distinct_id = uniqueID;
    };

    /**
        name_tag(name)
        ---
        Provide a string to recognize the user by.  The string passed to
        this method will appear in the Mixpanel Streams product rather
        than an automatically generated name.  Name tags do not have to
        be unique.

        name:string              the user identifier
    */
    metrics.name_tag = function(name) {
        metrics.properties.name_tag = name;
    };

    /**
        track_funnel(funnel, step, goal, properties, callback)
        ---
        this function tracks a specific step in a funnel
        
        NOTE: this is not the recommended way of using funnels, use events
        and the funnel creator in the web interface instead
        
        funnel:string                   the funnel name
        step:int                        the step number
        goal:string                     the name of the step
        properties:object               additional event properties to send
        callback:function(err:Error)    callback is called when the request is
                                        finished or an error occurs
    */
    metrics.track_funnel = function(funnel, step, goal, properties, callback) {
        if(!properties) { properties = {}; }
        
        properties.funnel = funnel;
        properties.step = step;
        properties.goal = goal;
        
        metrics.track('mp_funnel', properties, callback);
    };
    
    /**
        set_config(config)
        ---
        Modifies the mixpanel config
        
        config:object       an object with properties to override in the
                            mixpanel client config
    */
    metrics.set_config = function(config) {
        for (var c in config) {
            if (config.hasOwnProperty(c)) {
                metrics.config[c] = config[c];
            }
        }
    };

    if (config) {
        metrics.set_config(config);
    }
    
    return metrics;
};

// module exporting
module.exports = {
    Client: client
};
