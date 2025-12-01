const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TimeEntry = sequelize.define('TimeEntry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  clockIn: {
    type: DataTypes.DATE,
    allowNull: false
  },
  clockOut: {
    type: DataTypes.DATE,
    allowNull: true
  },
  breakStart: {
    type: DataTypes.DATE,
    allowNull: true
  },
  breakEnd: {
    type: DataTypes.DATE,
    allowNull: true
  },
  totalHours: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Calculated total hours worked'
  },
  totalBreakMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  routeId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'routes',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  adjustedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Manager who adjusted this entry'
  },
  adjustmentReason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'time_entries',
  indexes: [
    { fields: ['userId'] },
    { fields: ['clockIn'] },
    { fields: ['routeId'] }
  ],
  hooks: {
    beforeSave: (timeEntry) => {
      // Calculate total hours when clock out is set
      if (timeEntry.clockIn && timeEntry.clockOut) {
        const clockInTime = new Date(timeEntry.clockIn);
        const clockOutTime = new Date(timeEntry.clockOut);
        const diffMs = clockOutTime - clockInTime;
        const diffHours = diffMs / (1000 * 60 * 60);

        // Subtract break time if applicable
        let breakHours = 0;
        if (timeEntry.breakStart && timeEntry.breakEnd) {
          const breakStartTime = new Date(timeEntry.breakStart);
          const breakEndTime = new Date(timeEntry.breakEnd);
          const breakMs = breakEndTime - breakStartTime;
          breakHours = breakMs / (1000 * 60 * 60);
          timeEntry.totalBreakMinutes = Math.round((breakMs / (1000 * 60)));
        }

        timeEntry.totalHours = Math.round((diffHours - breakHours) * 100) / 100;
      }
    }
  }
});

module.exports = TimeEntry;
