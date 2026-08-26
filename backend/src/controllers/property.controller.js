import * as propertyService from '../services/property.service.js';

export async function list(req, res, next) {
  try {
    const properties = await propertyService.listPropertiesForOwner(req.user.id);
    return res.status(200).json({ success: true, data: { properties } });
  } catch (error) {
    return next(error);
  }
}

export async function getOne(req, res, next) {
  try {
    const property = await propertyService.getPropertyForOwner(req.user.id, req.params.id);
    return res.status(200).json({ success: true, data: { property } });
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res, next) {
  try {
    const property = await propertyService.createPropertyForOwner(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: { property },
    });
  } catch (error) {
    return next(error);
  }
}

export async function update(req, res, next) {
  try {
    const property = await propertyService.updatePropertyForOwner(
      req.user.id,
      req.params.id,
      req.body,
    );
    return res.status(200).json({
      success: true,
      message: 'Property updated successfully',
      data: { property },
    });
  } catch (error) {
    return next(error);
  }
}

export async function remove(req, res, next) {
  try {
    await propertyService.deletePropertyForOwner(req.user.id, req.params.id);
    return res.status(200).json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    return next(error);
  }
}
