import axios from 'axios';
import { apiRequest } from './AuthorizationService';
import { catchError } from "rxjs/operators";
import { from, of, throwError } from "rxjs";
import session from "../util/session";
import QueryString from 'querystring';

export const ApiResource = function () {

  let args = Array.prototype.slice.call(arguments).flat();
  let params = args[args.length - 1];
  let headers;
  let size;
  let onUploadProgress;
  let cancelToken;
  let responseType;

  if (params && params.constructor === Object) {
    params = args.pop();

    onUploadProgress = params.onUploadProgress;
    delete params.onUploadProgress;
    cancelToken = params.cancelToken;
    delete params.cancelToken;
    responseType = params.responseType;
    delete params.responseType;

    headers = params.headers;
    if (headers &&
      headers.constructor === Object &&
      ((size = Object.keys(params).length) === 1 || (size === 2 && params.params && params.params.constructor === Object))) {
      params = params.params || {}
    } else {
      headers = {}
    }
  } else {
    headers = params = {};
  }

  const config = {
    headers,
    params,
    onUploadProgress,
    cancelToken,
    responseType
  };

  this.path = args.join('/');

  this.get = () => from(apiRequest({ url: this.path, method: 'GET', ...config }));

  this.delete = () => from(apiRequest({ url: this.path, method: 'DELETE', ...config }));

  this.post = (data) => from(apiRequest({ url: this.path, method: 'POST', data, ...config }));
};

const ErrorCallbacks = [];

const ConnectionRefusedCallbacks = [];

const API = {
  get: (...args) => {
    return (new ApiResource(...args)).get().pipe(
      catchError(e => {
        if (axios.isCancel(e)) {
          throw e;
        }
        if (e.response) {
          if (e.response.status === 422) {
            return throwError(e);
          }
          if (e.response.status !== 404 && e.response.status !== 403) {
            ErrorCallbacks.forEach(callback => callback(e));
          }
        } else {
          ConnectionRefusedCallbacks.forEach(callback => callback(e));
        }
        return of(null);
      })
    )
  },

  post: (...args) => {
    const data = args.pop();
    return (new ApiResource(...args)).post(data).pipe(
      catchError(e => {
        if (e.response) {
          switch (e.response.status) {
            case 404:
              break;
            case 403:
            case 422:
              throw e;
            default:
              ErrorCallbacks.forEach(callback => callback(e));
          }
          return of(null);
        } else {
          ConnectionRefusedCallbacks.forEach(callback => callback(e));
        }
        throw e;
      })
    );
  },

  delete: (...args) => {
    return (new ApiResource(...args)).delete().pipe(
      catchError(e => {
        if (axios.isCancel(e)) {
          throw e;
        }
        if (e.response) {
          switch (e.response.status) {
            case 404:
            case 422:
              break;
            default:
              ErrorCallbacks.forEach(callback => callback(e));
          }
        } else {
          ConnectionRefusedCallbacks.forEach(callback => callback(e));
        }
        throw e;
      })
    );
  },

  onError: callback => ErrorCallbacks.push(callback),

  onConnectionRefused: callback => ConnectionRefusedCallbacks.push(callback),

  setupOAuth2Credentials: () => {
    const params = QueryString.parse(window.location.search.slice(1, window.location.search.length));
    if (params.cenitHost) session.cenitBackendBaseUrl = params.cenitHost;

    const url = `${session.cenitBackendBaseUrl}/app/admin/oauth2/client/credentials`;
    const reverse = (str) => str.split('').reverse().join('');

    return axios.get(url).then(({ data: { client_token } }) => {
      const { OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET } = JSON.parse(window.atob(reverse(client_token)));

      session.set('OAUTH_CLIENT_ID', OAUTH_CLIENT_ID);
      session.set('OAUTH_CLIENT_SECRET', OAUTH_CLIENT_SECRET);

      return [OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET];
    });
  }
};

export default API;
