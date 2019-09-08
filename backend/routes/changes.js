const express = require('express');
const router = express.Router();
const Change = require('../models/change');
const jsonpatch = require('fast-json-patch');
const mongoose = require('mongoose');

module.exports = function changesFactory(entityName, EntityModel) {
  /**
   * Get all non-approved changes in entities
   */
  router.get(`/changes/${entityName}`, async (req, res) => {
    const changes = await Change
      .find({ entityType: entityName, approved: null })
      .populate('entity')
      .lean();

    res.json({ payload: changes });
  });

  /**
   * Get changes for certain record
   */
  router.get(`/changes/${entityName}/:changesRecordId`, async (req, res) => {
    const changeRecord = await Change
      .findById(req.params.changesRecordId)
      .populate('entity');

    return res.status(200).json({ payload: changeRecord });
  });

  /**
   * Create new change record for existing or non-existing entity
   */
  router.post(`/changes/${entityName}/:entityId?`, async (req, res) => {
    const changeRecord = new Change({
      entityType: entityName,
      user: res.locals.user._id,
      ...(req.params.entityId && { entity: req.params.entityId }),
      changeList: await EntityModel.getChangesList(req.params.entityId, req.body)
    });
    const result = await changeRecord.save();

    res.status(201).json({ payload: result });
  });

  /**
   * Patch existing change record
   */
  router.patch(`/changes/${entityName}/:changesRecordId`, async (req, res) => {
    const changeRecord = await Change.findById(req.params.changesRecordId);

    changeRecord.changeList = await EntityModel.getChangesList(changeRecord.entity, req.body);
    await changeRecord.save();
    res.sendStatus(200);
  });

  /**
   * Approve changelist
   */
  router.put(`/changes/${entityName}/:changeId/approval`, async (req, res) => {
    const changeRecord = await Change.findById(req.params.changeId).populate('entity');

    if (changeRecord.entity) {
      const updatedDocument = jsonpatch.applyPatch(JSON.parse(JSON.stringify(changeRecord.entity)), changeRecord.changeList).newDocument;

      await EntityModel.updateOne({ _id: mongoose.Types.ObjectId(changeRecord.entity._id) }, updatedDocument);

      // @todo make request to the api for updating item

      changeRecord.approved = true;
      await changeRecord.save();
    } else {
      const entity = new EntityModel(jsonpatch.applyPatch({}, changeRecord.changeList).newDocument);

      changeRecord.approved = true;
      // @todo make request to the api for creating item

      await Promise.all([entity.save(), changeRecord.save()]);
    }
    res.sendStatus(200);
  });

  return router;
};
