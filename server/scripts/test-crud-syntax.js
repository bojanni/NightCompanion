try {
    const createCrudRouter = require('../routes/crud');
    console.log('Successfully required crud.js');
} catch (e) {
    console.error('Error requiring crud.js:', e);
}
