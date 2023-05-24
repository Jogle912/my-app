import axios from 'axios';

const canvasAPI = axios.create({
  baseURL: 'https://auburn.instructure.com',
  headers: {
    'Authorization': `Bearer 4~L8yvh4NONzjJ2RSJ5Rh5PNreT2OjJHKe5DKGza7DDGN7lJqjgdCkPBQANePy2ELn` 
  }
});

export default canvasAPI;
