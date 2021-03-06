<template>
  <div class="entities-overview-specific">
    <button
      v-if="loaded && !isChangedEntityShowed"
      class="button button--secondary"
      @click="isEditMode = true"
    >
      {{ $t('entities.edit') }}
    </button>
    <button
      v-if="loaded && isChangedEntityShowed && isUserCanEditThisEntity"
      class="button button--primary"
      @click="saveEntity"
    >
      {{ $t('entities.save') }}
    </button>
    <button
      v-if="isUserCanEditThisEntity && !deleted"
      class="button button--danger"
      @click="deleteEntity"
    >
      {{ $t('entities.markForDeletion') }}
    </button>
    <button
      v-if="isUserCanEditThisEntity && deleted"
      class="button"
      @click="cancelDeletion"
    >
      {{ $t('entities.cancelDeletion') }}
    </button>
    <ApproveButton
      v-if="lastChangesRecord"
      :change-record-id="lastChangesRecord._id"
      :entity-type="model.entityType"
      @success="$router.push({ name: `${model.entityType}-overview` })"
    />
    <RejectButton
      v-if="lastChangesRecord"
      :user-id="lastChangesRecord.user._id"
      :change-record-id="lastChangesRecord._id"
      :entity-type="model.entityType"
      @success="$router.push({ name: `${model.entityType}-overview` })"
    />
    <span
      v-if="lastChangesRecord"
      class="entities-overview-specific__changes-author"
    >
      {{ $t('entities.changesAuthor') }}: {{ lastChangesRecord.user.username }}
    </span>
    <div class="entities-overview-specific__container">
      <div class="entities-overview-specific__original-entity-container">
        <h2 v-if="isChangedEntityShowed">
          {{ $t('entities.beforeChanges') }}
        </h2>
        <component
          :is="infoComponent"
          v-if="originalEntity"
          class="entities-overview-specific__original-entity"
          :entity="originalEntity"
        />
      </div>
      <div
        v-if="isChangedEntityShowed"
        class="entities-overview-specific__delimiter"
      />
      <div
        v-if="isChangedEntityShowed"
        class="entities-overview-specific__changed-entity-container"
      >
        <h2>{{ $t('entities.afterChanges') }}</h2>
        <div
          v-if="deleted"
          class="entities-overview-specific__deleted-message"
        >
          {{ $t('entities.deletedMessage') }}
        </div>
        <component
          :is="infoComponent"
          v-if="changedEntity"
          class="entities-overview-specific__changed-entity"
          :entity="changedEntity"
          :editable="isUserCanEditThisEntity"
        />
      </div>
    </div>
  </div>
</template>

<script>
  /* eslint-disable new-cap */

  import axios from 'axios';
  import jsonpatch from 'fast-json-patch';
  import cloneDeep from 'lodash.clonedeep';
  import notifier from 'codex-notifier';
  import ApproveButton from '../../components/ApproveButton';
  import RejectButton from '../../components/RejectButton';

  export default {
    name: 'EntitiesOverviewSpecific',
    components: {
      ApproveButton,
      RejectButton
    },
    props: {
      model: {
        type: Function,
        required: true
      }
    },
    data() {
      return {
        originalEntity: null, // entity data before modification
        lastChangesRecord: null,
        changedEntity: null,
        infoComponent: null,
        deleted: false,
        loaded: false,
        isEditMode: false
      };
    },
    computed: {
      isChangedEntityShowed() {
        return (this.lastChangesRecord || this.isEditMode);
      },

      isUserCanEditThisEntity() {
        if (!this.loaded) return false;

        if (this.$store.state.auth.user.isAdmin) return true;

        return this.lastChangesRecord ? (this.$store.state.auth.user.id === this.lastChangesRecord.user._id) : true;
      }
    },
    async mounted() {
      await this.fetchData();
    },
    methods: {
      deleteEntity() {
        this.deleted = true;
        this.saveEntity();
      },

      cancelDeletion() {
        this.deleted = false;
        this.saveEntity();
      },

      async fetchData() {
        this.infoComponent = (await import('../' + this.model.entityType + '/Info')).default;

        let entityData;

        try {
          entityData = await axios.get(`/${this.model.entityType}/${this.$route.params.entityId}`, {
            params: {
              withLastChanges: true
            }
          });
        } catch (e) {
          notifier.show({
            message: e.message,
            style: 'error',
            time: 2000
          });

          this.$router.push({
            name: `${this.model.entityType}-overview`
          });

          return;
        }

        // If entity was modified
        if (entityData.lastChangesRecord) {
          this.lastChangesRecord = entityData.lastChangesRecord;
          delete entityData.lastChangesRecord;

          if (this.lastChangesRecord.isCreated) {
            this.$router.push({
              name: `${this.model.entityType}-create`,
              params: {
                changeRecordId: this.lastChangesRecord._id
              }
            });
          }

          this.deleted = this.lastChangesRecord.deleted;

          this.changedEntity = new this.model(jsonpatch.applyPatch(cloneDeep(entityData), this.lastChangesRecord.changeList).newDocument);
        } else {
          // If entity was not modified yet
          this.changedEntity = new this.model(entityData);
        }

        this.originalEntity = new this.model(entityData);
        this.loaded = true;
      },

      async saveEntity() {
        try {
          if (this.lastChangesRecord) {
            // Update existing changes record
            await axios.patch(`/changes/${this.model.entityType}/${this.lastChangesRecord._id}`, {
              changedEntity: this.changedEntity.data,
              deleted: this.deleted
            });
          } else {
            // Create new changes record
            this.lastChangesRecord = await axios.post(`/changes/${this.model.entityType}/${this.originalEntity.id}`, {
              changedEntity: this.changedEntity.data,
              deleted: this.deleted
            });
          }
          notifier.show({
            message: this.$t('notifications.savedSuccessfully'),
            time: 2000
          });
        } catch (e) {
          notifier.show({
            message: e.message,
            style: 'error',
            time: 2000
          });
        }
      }
    }
  };
</script>

<style>
  .entities-overview-specific {
    .button {
      margin-left: 5px;
    }

    &__changes-author {
      float: right;
    }

    &__container {
      margin-top: 10px;
      overflow: hidden;
      display: flex;
      justify-content: space-around;
    }

    &__original-entity,
    &__changed-entity {
      min-width: 400px;
    }

    &__delimiter {
      margin: 10px;
      border-left: 1px solid black;
    }

    &__deleted-message {
      border: 1px solid black;
      padding: 5px;
      margin: 5px;
      background-color: rgba(255, 32, 0, 0.63);
    }

    &__original-entity-container,
    &__changed-entity-container {
      width: 45%;
    }
  }
</style>
