/**
  Copyright (C) 2009-2012. David Thevenin, ViniSketch SARL (c), and
  contributors. All rights reserved

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Lesser General Public License as published
  by the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

/**
 * The vs.core.Model class
 *
 * @extends vs.core.EventSource
 * @class
 * vs.core.Model is a class that defines the basic Model mechanisms to implement
 * a MVC like architecture. If you need to implement a MVC component, you
 * should extend this class.<br/><br/> >>>> THIS CODE IS STILL UNDER BETA AND
 * THE API MAY CHANGE IN THE FUTURE <<< <p>
 * WikiPedia gives this following definition of a model:<br>
 * "The model manages the behavior and data of the application, responds to
 * requests for information about its state (usually from the view), and
 * responds to instructions to change state (usually from the controller)"
 * <p>
 * The Model class exposes 2 kinds of mechanisms you will need:
 * <ul>
 *  <li> Change event binding
 *  <li> Properties change propagation
 * </ul>
 *
 * <p/>
 *
 * <p/>
 * The fallowing example show a TodoModel class with three properties
 * @example
 *  var TodoModel = vs.core.createClass ({
 *
 *   // parent class
 *   parent: vs.core.Model,
 *
 *   // Properties definition
 *   properties : {
 *     content: vs.core.Object.PROPERTY_IN_OUT,
 *     done: vs.core.Object.PROPERTY_IN_OUT,
 *     date: vs.core.Object.PROPERTY_OUT
 *   },
 *
 *   // Initialization
 *   initComponent : function ()
 *   {
 *     this._date = new Date ();
 *     this._done = false;
 *     this._content = "";
 *   }
 * });
 *
 * var myModel = new TodoModel ({content:"Something to do"});
 * myModel.init ();
 *
 * @see vs.core.DataStorage
 * @author David Thevenin
 *
 *  @constructor
 *  Main constructor
 *
 * @name vs.core.Model
 *
 * @param {Object} config the configuration structure
 */
function Model (config)
{
  this.parent = EventSource;
  this.parent (config);
  this.constructor = vs.core.Model;

  this.__links__ = [];
}

Model.prototype = {

  /*****************************************************************
   *
   ****************************************************************/

  /**
   * @protected
   * @type {Array}
   */
   __links__: null,

  /**
   * @protected
   * @type {Boolean}
   */
   __should_propagate_changes__: true,

  /**
   * @protected
   * @type {vs.core.DataStorage}
   */
   _sync_service_: null,

  /*****************************************************************
   *
   ****************************************************************/

  /**
   * The event bind method to listen model changes
   * <p/>
   * When you want listen modificaan event generated by this object, you can
   * bind your object (the observer) to this object using 'bindChange' method.
   * <p/>
   *
   * @name vs.core.Model#bindChange
   * @function
   * @example
   *  // Listen every change of the model
   *  myModel.bindChange ('', this, this.onChange);
   *  // Listen all the 'add' change of the model
   *  myModel.bindChange ('add', this, this.onChange);
   *
   * @param {string} action the event specification [optional]
   * @param {vs.core.Object} obj the object interested to catch the event [mandatory]
   * @param {string} func the name of a callback. If its not defined
   *        notify method will be called [optional]
   */
  bindChange : function (spec, obj, func)
  {
    if (!obj) { return; }

    this.bind ((spec)? 'change:' + spec : 'change', obj, func);
  },

  /**
   *  The event unbind change method
   *  <p>
   *  Should be call when you want stop event listening on this object
   *
   * @name vs.core.Model#unbindChange
   * @function
   *
   * @param {string} spec the event specification [optional]
   * @param {vs.core.Object} obj the object you want unbind [mandatory]
   * @param {string} func the name of a callback. If its not defined
   *        all binding with <spec, obj> will be removed
   */
  unbindChange : function (spec, obj, func)
  {
    this.unbind ((spec)? 'change:' + spec : 'change', obj, func);
  },

  /**
   * Configure the model to do not propagate event change.<br/>
   * In order to aggregate rapid changes to a model, you will deactivate
   * change event propagate.
   * After all change are finish you can manual call model.change () to
   * trigger the event.
   * <p>
   * Calling model.change () will reactivate event propagation.
   *
   * @name vs.core.Model#stopPropagation
   * @function
   */
  stopPropagation : function ()
  {
    this.__should_propagate_changes__ = false;
  },

  /**
   *  When you override a Model, you should call this.hasToPropagateChange ()
   *  before calling this.change ().
   *  <p>
   *  Calling model.change () will reactivate event propagation.
   *
   * @name vs.core.Model#hasToPropagateChange
   * @function
   * @protected
   */
  hasToPropagateChange : function ()
  {
    return this.__should_propagate_changes__;
  },

  /**
   * Manually trigger the "change" event.
   * If you have deactivated propagation using myModel.stopPropagation ()
   * in order to aggregate changes to a model, you will want to call
   * myModel.change () when you're all finished.
   * <p>
   * Calling myModel.change () reactivate automatic change propagation
   *
   * @name vs.core.Model#change
   * @function
   *
   * @param {String} action the event specification [optional]
   */
  change : function (spec, data, doNotManageLinks)
  {
    var list_bind, event, handler;

    this.__should_propagate_changes__ = true;

    spec = (spec)? 'change:' + spec : 'change';
    event = new Event (this, spec, data);

    try
    {
      // 1) manage links propagation
      if (!doNotManageLinks)
      {
        var l = this.__links__.length, obj;
        while (l--) { this.__links__ [l].configure (this); }
      }

      //propagate retrictive bindings
      if (spec !== 'change')
        queueProcSyncEvent (event, this.__bindings__ [spec]);

      //propagate general change
      queueProcSyncEvent (event, this.__bindings__ ['change']);
    }
    catch (e)
    {
      if (e.stack) console.error (e.stack);
      console.error (e);
    }
  },

  /**
   * Removes all elements of this Model.<br/>
   * This is an abstract method, and should be implemented with your own
   * object.
   * @name vs.core.Model#clear
   * @param {Boolean} should_free free content items
   * @function
   */
  clear : function (should_free)
  {
    var
      _properties_ = this.getModelProperties (),
      _prop_name,
      self = this;
    
    _properties_.forEach (function (prop_name) {
      _prop_name = '_' + util.underscore (prop_name);
      
      // free the property
      if (should_free) vs.util.free (self [_prop_name]);
      
      // set the property to null
      self [_prop_name] = undefined;
      
      // remove property if its dynamic
      if (self.__properties__ && 
          self.__properties__.indexOf (prop_name) !== -1) {
        delete (self [prop_name]);
      }
    });
  },

  /**
   *  Propagate an event
   *  <p>
   *  All Object listening this EventSource will receive this new handled
   *  event.
   *
   * @name vs.core.EventSource#propagate
   * @function
   *
   * @param {String} spec the event specification [mandatory]
   * @param {Object} data an optional data event [optional]
   * @param {vs.core.Object} srcTarget a event source, By default this object
   *        is the event source [mandatory]
   */
  propagate : function (type, data, srcTarget)
  {
    this.__should_propagate_changes__ = true;

    EventSource.prototype.propagate.call (this, type, data, srcTarget);
  },

  /**
   * @protected
   *
   * @name vs.core.Model#linkTo
   * @function
   *
   * @param {vs.core.Object} linkTo object
   */
  linkTo : function (obj)
  {
    if (obj instanceof vs.core.Object)
    {
      if (this.__links__.indexOf (obj) === -1)
      { this.__links__.push (obj); }
    }
  },

  /**
   * @protected
   *
   * @name vs.core.Model#unlinkTo
   * @function
   *
   * @param {vs.core.Object} linkTo object
   */
  unlinkTo : function (obj)
  {
    if (obj instanceof vs.core.Object)
    {
      this.__links__.remove (obj);
    }
  },

  /**
   * Manually force dataflow properties change propagation.
   * <br/>
   * If no property name is specified, the system will assume all component's
   * input properties have been modified.
   *
   * @name vs.core.Model#propertyChange
   * @function
   *
   * @param {String} property the name of the modified property.[optional]
   */
  propertyChange : function (property)
  {
    if (vs._default_df_) { vs._default_df_.propagate (this, property); }

    if (this.__should_propagate_changes__)
    {
      var l = this.__links__.length, obj;
      if (property) while (l--)
      { this.__links__ [l] [property] = this [property]; }
      else while (l--) { this.__links__ [l].configure (this); }

      this.change (null, null, true);
    }
  },

  /**
   * @protected
   */
  parseData : function (obj)
  {
    var prop_name;
      
    for (prop_name in obj)
    {
      this._parse_property (prop_name, obj [prop_name]);
    }
  },

  /**
   * @protected
   */
  _parse_property : function (prop_name, value)
  {
    var
      _properties_ = this.getModelProperties (),
      desc, _prop_name = '_' + util.underscore (prop_name), model;

    if ((value && value.data) || util.isArray (value))
    {
      model = new VSArray ({id: value.id}).init ();
      model.parseData (value);
    }
    else model = value;
    
    if (_properties_.indexOf (prop_name) === -1)
    {
      // add propperty
      desc = {};
      _prop_name = '_' + util.underscore (prop_name);
      desc.set = (function (prop_name, _prop_name)
      {
        return function (v)
        {
          this[_prop_name] = v;
          this.propertyChange (prop_name);
        };
      }(prop_name, _prop_name));
      
      desc.get = (function (_prop_name)
      {
        return function ()
        {
          return this[_prop_name];
        };
      }(_prop_name));
      
      this.defineProperty (prop_name, desc);
    }


//         if (util.isString (value))
//         {
//           result = util.__date_reg_exp.exec (value);
//           if (result && result [1]) // JSON Date -> Date generation
//           {
//             this ['_' + key] = new Date (parseInt (result [1]));
//           }
//           else this ['_' + key] = value; // String
//         }
    
    this [_prop_name] = model;
  }
};
util.extendClass (Model, EventSource);

/********************************************************************
                      Export
*********************************************************************/
/** @private */
core.Model = Model;
