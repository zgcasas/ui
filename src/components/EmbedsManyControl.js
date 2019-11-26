import React, { useState } from 'react';
import { IconButton, TextField } from "@material-ui/core";
import AddIcon from '@material-ui/icons/Add';
import CreateIcon from '@material-ui/icons/AddCircleOutline';
import ArrowDropUpIcon from '@material-ui/icons/ArrowDropUp';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import ClearIcon from '@material-ui/icons/Clear';
import ObjectControl from "./ObjectControl";
import { Property } from "../services/DataTypeService";
import '../common/FlexBox.css';
import { ItemChip } from "./ItemChip";
import { map, switchMap } from "rxjs/operators";
import { INDEX } from "../common/Symbols";



function EmbedsManyControl({ rootDataType, jsonPath, title, value, property, errors, onDelete, onChange, schema, disabled, onStack, rootId, readOnly }) {

    const [open, setOpen] = useState(false);
    const [controlProperty] = useState(new Property({
        dataType: property.dataType,
        propertySchema: schema
    }));
    const [selectedIndex, setSelectedIndex] = useState(-1);

    if (rootId && value && !value.indexed) {
        value.forEach((item, index) => item[INDEX] = index);
        value.indexed = true;
    }

    const addNew = () => {
        if (value) {
            value.push({});
        } else {
            value = [];
        }
        setSelectedIndex(value.length - 1);
        if (value.length > 0) {
            setOpen(true);
        }
        onChange(value);
    };

    const deleteIndex = index => {
        const newValue = [...value];
        newValue.indexed = value.indexed;
        newValue.splice(index, 1);
        if (newValue.length === 0) {
            setOpen(false);
        } else if (selectedIndex === index) {
            setSelectedIndex(-1);
        } else if (selectedIndex === newValue.length) {
            setSelectedIndex(newValue.length - 1);
        }
        onChange(newValue);
    };

    /* TODO const seek = (x) => () => {
        let tmp = value[selectedIndex];
        value[selectedIndex] = value[selectedIndex + x];
        value[selectedIndex + x] = tmp;
        setSelectedIndex(selectedIndex + x);
        onChange(value);
    }; */

    const handleChange = item => {
        value[selectedIndex] = item;
        onChange(value);
    };

    const selectItem = index => () => setSelectedIndex(index);

    const deleteItem = index => () => deleteIndex(index);

    let dropButton, deleteButton, itemChips;

    const handleStack = item => onStack({
        ...item,
        title: itemValue => property.dataType.titleFor(value[selectedIndex]).pipe(
            switchMap(
                selectedTitle => item.title(itemValue).pipe(
                    map(
                        itemTitle => `[${property.name} #${selectedIndex}] ${selectedTitle} ${itemTitle}`
                    )
                )
            )
        )
    });

    if (value) {
        if (open) {
            itemChips = value.map(
                (item, index) => <ItemChip key={`item_${index}`}
                                           dataType={property.dataType}
                                           item={item}
                                           error={errors && errors.hasOwnProperty(String(index))}
                                           onSelect={selectItem(index)}
                                           onDelete={deleteItem(index)}
                                           selected={selectedIndex === index}
                                           disabled={disabled}
                                           readOnly={readOnly}/>
            );

            dropButton = !readOnly && value.length > 0 &&
                <IconButton onClick={() => setOpen(false)} disabled={disabled}>
                    <ArrowDropUpIcon/>
                </IconButton>;

            let itemControl;

            if (selectedIndex !== -1) {
                controlProperty.jsonKey = controlProperty.name = selectedIndex;
                let editProps;
                const index = value[selectedIndex][INDEX];
                if (typeof index === 'number') {
                    editProps = {
                        rootId,
                        rootDataType,
                        jsonPath: `${jsonPath}[${index}]`
                    };
                }
                itemControl = (
                    <ObjectControl key={`ctrl_${selectedIndex}`}
                                   property={controlProperty}
                                   value={value[selectedIndex]}
                                   errors={errors && errors[String(selectedIndex)]}
                                   onChange={handleChange}
                                   disabled={disabled}
                                   readOnly={readOnly}
                                   onStack={handleStack}
                                   {...editProps}/>
                );
            }

            itemChips = (
                <div className='flex column'>
                    <div style={{ display: 'flex', paddingTop: '10px', flexWrap: 'wrap' }}>
                        {itemChips}
                    </div>
                    {itemControl}
                </div>
            );
        } else {
            dropButton = value.length > 0 &&
                <IconButton onClick={() => setOpen(true)} disabled={disabled}>
                    <ArrowDropDownIcon/>
                </IconButton>;
        }
        if (!readOnly) {
            deleteButton = <IconButton onClick={onDelete} disabled={disabled}><ClearIcon/></IconButton>;
        }
    }

    let addButton;
    if (!readOnly) {
        const AddNewIcon = value ? AddIcon : CreateIcon;
        addButton = <IconButton onClick={addNew} disabled={disabled}><AddNewIcon/></IconButton>;
    }

    const itemsCount = value ? `${value.length} items` : '';

    const placeholder = itemsCount || String(value) || itemsCount;

    return (
        <div className='flex full-width column'>
            <div className='flex full-width'>
                <TextField label={title}
                           readOnly
                           style={{ flexGrow: 1 }}
                           value={itemsCount}
                           placeholder={placeholder}
                           error={(errors && Object.keys(errors).length > 0) || false}/>
                {dropButton}
                {addButton}
                {deleteButton}
            </div>
            {itemChips}
        </div>
    );
}

export default EmbedsManyControl;
